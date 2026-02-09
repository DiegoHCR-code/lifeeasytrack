import { StatusFatura, TipoConta } from "@prisma/client";
import { prisma } from "@shared/db/prisma";

function utcDate(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0, ms = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss, ms));
}

function addMonthsUTC(date: Date, months: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0)
  );
}

function parseCompetencia(competencia: string) {
  const [y, m] = competencia.split("-").map(Number);
  return { y, m };
}

/**
 * competencia = mês do VENCIMENTO (YYYY-MM)
 * - vencimentoDia > fechamentoDia  => fechamento no mesmo mês do vencimento
 * - vencimentoDia <= fechamentoDia => fechamento no mês anterior ao vencimento
 */
export function computeInvoiceCycleByCompetencia(
  competencia: string,
  fechamentoDia: number,
  vencimentoDia: number
) {
  const { y, m } = parseCompetencia(competencia);

  const vencimento = utcDate(y, m, vencimentoDia, 0, 0, 0, 0);

  const fechamentoMonth = vencimentoDia > fechamentoDia ? m : m === 1 ? 12 : m - 1;
  const fechamentoYear = vencimentoDia > fechamentoDia ? y : m === 1 ? y - 1 : y;

  const fechamento = utcDate(fechamentoYear, fechamentoMonth, fechamentoDia, 23, 59, 59, 999);

  const fechamentoAnteriorBase = utcDate(fechamentoYear, fechamentoMonth, fechamentoDia, 0, 0, 0, 0);
  const fechamentoAnterior = addMonthsUTC(fechamentoAnteriorBase, -1);

  const inicio = new Date(fechamentoAnterior.getTime());
  inicio.setUTCDate(inicio.getUTCDate() + 1);
  inicio.setUTCHours(0, 0, 0, 0);

  const fim = new Date(fechamento.getTime());
  return { inicio, fim, fechamento, vencimento };
}

function computeCompetenciaFromDate(nowUTC: Date, fechamentoDia: number, vencimentoDia: number) {
  const y = nowUTC.getUTCFullYear();
  const m = nowUTC.getUTCMonth() + 1;
  const day = nowUTC.getUTCDate();

  let fechamentoY = y;
  let fechamentoM = m;

  if (day > fechamentoDia) {
    const next = addMonthsUTC(utcDate(y, m, 1), 1);
    fechamentoY = next.getUTCFullYear();
    fechamentoM = next.getUTCMonth() + 1;
  }

  let vencY = fechamentoY;
  let vencM = fechamentoM;

  if (vencimentoDia <= fechamentoDia) {
    const next = addMonthsUTC(utcDate(fechamentoY, fechamentoM, 1), 1);
    vencY = next.getUTCFullYear();
    vencM = next.getUTCMonth() + 1;
  }

  return `${vencY}-${String(vencM).padStart(2, "0")}`;
}

async function autoCloseInvoiceIfNeeded(invoiceId: string, fechamento: Date) {
  if (new Date().getTime() > fechamento.getTime()) {
    await prisma.faturaCartao.updateMany({
      where: { id: invoiceId, status: StatusFatura.ABERTA },
      data: { status: StatusFatura.FECHADA },
    });
  }
}

export type CardBehavior = "SHIFT" | "BLOCK";

export async function resolveCardPostingDate(params: {
  userId: string;
  contaId: string;
  intendedDate: Date;
  behavior?: CardBehavior; // default SHIFT
}) {
  const { userId, contaId, intendedDate } = params;
  const behavior: CardBehavior = params.behavior ?? "SHIFT";

  const card = await prisma.conta.findFirst({
    where: { id: contaId, usuarioId: userId },
    select: { tipo: true, fechamentoDia: true, vencimentoDia: true },
  });

  // não é cartão => não mexe
  if (!card || card.tipo !== TipoConta.CARTAO) {
    return { ok: true as const, date: intendedDate, shifted: false, competencia: null, status: null };
  }
  if (!card.fechamentoDia || !card.vencimentoDia) {
    return { ok: true as const, date: intendedDate, shifted: false, competencia: null, status: null };
  }

  // transforma intendedDate em UTC-only (sem hora) pra calcular competência
  const d = new Date(intendedDate);
  const intendedUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));

  const competencia = computeCompetenciaFromDate(intendedUTC, card.fechamentoDia, card.vencimentoDia);
  const cycle = computeInvoiceCycleByCompetencia(competencia, card.fechamentoDia, card.vencimentoDia);

  // tenta achar a fatura já criada
  const invoice = await prisma.faturaCartao.findUnique({
    where: { contaId_competencia: { contaId, competencia } },
    select: { id: true, status: true, fechamento: true },
  });

  // se existe, faz auto-close se passou do fechamento
  if (invoice?.id) {
    await autoCloseInvoiceIfNeeded(invoice.id, invoice.fechamento);
  }

  const status = invoice?.status ?? StatusFatura.ABERTA;
  const fechamento = invoice?.fechamento ?? cycle.fechamento;

  // Se já passou do fechamento e ainda não existe/está aberta, considera fechada na prática
  const closedByTime = new Date().getTime() > fechamento.getTime();
  const effectiveStatus =
    status === StatusFatura.ABERTA && closedByTime ? StatusFatura.FECHADA : status;

  if (effectiveStatus === StatusFatura.FECHADA || effectiveStatus === StatusFatura.PAGA) {
    if (behavior === "BLOCK") {
      return {
        ok: false as const,
        message: "Fatura fechada: essa compra deve entrar na próxima fatura",
        competencia,
        status: effectiveStatus,
      };
    }

    // SHIFT: joga pro próximo ciclo (fechamento + 1 dia, 00:00 UTC)
    const shiftedDate = new Date(fechamento.getTime());
    shiftedDate.setUTCDate(shiftedDate.getUTCDate() + 1);
    shiftedDate.setUTCHours(0, 0, 0, 0);

    return {
      ok: true as const,
      date: shiftedDate,
      shifted: true,
      competencia,
      status: effectiveStatus,
    };
  }

  return {
    ok: true as const,
    date: intendedDate,
    shifted: false,
    competencia,
    status: effectiveStatus,
  };
}
