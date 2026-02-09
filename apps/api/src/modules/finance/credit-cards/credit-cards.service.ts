import { z } from "zod";
import { prisma } from "@shared/db/prisma";
import { Prisma, StatusFatura, StatusPagamento, TipoConta } from "@prisma/client";

const competenciaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Use "YYYY-MM" (ex: 2026-03)');

const createCardSchema = z.object({
  nome: z.string().min(2),
  fechamentoDia: z.number().int().min(1).max(28),
  vencimentoDia: z.number().int().min(1).max(28),
});

const updateCardSchema = z.object({
  nome: z.string().min(2).optional(),
  fechamentoDia: z.number().int().min(1).max(28).optional(),
  vencimentoDia: z.number().int().min(1).max(28).optional(),
});

function parseCompetencia(competencia: string) {
  const [y, m] = competencia.split("-").map(Number);
  return { y, m };
}

function utcDate(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0, ms = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss, ms));
}

function addMonthsUTC(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 0, 0, 0, 0));
}

function toNumberDecimal(d: any) {
  return Number(d);
}

/**
 * competencia = mês do VENCIMENTO (YYYY-MM)
 * - vencimentoDia > fechamentoDia  => fechamento no mesmo mês do vencimento
 * - vencimentoDia <= fechamentoDia => fechamento no mês anterior ao vencimento
 */
function computeInvoiceCycleByCompetencia(
  competencia: string,
  fechamentoDia: number,
  vencimentoDia: number
) {
  const { y, m } = parseCompetencia(competencia);

  const vencimento = utcDate(y, m, vencimentoDia, 0, 0, 0, 0);

  const fechamentoMonth = vencimentoDia > fechamentoDia ? m : (m === 1 ? 12 : m - 1);
  const fechamentoYear = vencimentoDia > fechamentoDia ? y : (m === 1 ? y - 1 : y);

  const fechamento = utcDate(fechamentoYear, fechamentoMonth, fechamentoDia, 23, 59, 59, 999);

  const fechamentoAnteriorBase = utcDate(fechamentoYear, fechamentoMonth, fechamentoDia, 0, 0, 0, 0);
  const fechamentoAnterior = addMonthsUTC(fechamentoAnteriorBase, -1);

  const inicio = new Date(fechamentoAnterior.getTime());
  inicio.setUTCDate(inicio.getUTCDate() + 1);
  inicio.setUTCHours(0, 0, 0, 0);

  const fim = new Date(fechamento.getTime()); // já no fim do dia
  return { inicio, fim, fechamento, vencimento };
}

/**
 * Retorna competencia/cycle da fatura "atual" pela data de hoje.
 */
function computeCurrentInvoiceCompetenciaAndCycle(
  nowUTC: Date,
  fechamentoDia: number,
  vencimentoDia: number
) {
  const y = nowUTC.getUTCFullYear();
  const m = nowUTC.getUTCMonth() + 1;
  const day = nowUTC.getUTCDate();

  // ciclo atual fecha neste mês se ainda não passou do fechamento; senão, fecha no próximo mês
  let fechamentoY = y;
  let fechamentoM = m;

  if (day > fechamentoDia) {
    const next = addMonthsUTC(utcDate(y, m, 1), 1);
    fechamentoY = next.getUTCFullYear();
    fechamentoM = next.getUTCMonth() + 1;
  }

  // vencimento normalmente no mesmo mês do fechamento, mas se vencimentoDia <= fechamentoDia => mês seguinte
  let vencY = fechamentoY;
  let vencM = fechamentoM;

  if (vencimentoDia <= fechamentoDia) {
    const next = addMonthsUTC(utcDate(fechamentoY, fechamentoM, 1), 1);
    vencY = next.getUTCFullYear();
    vencM = next.getUTCMonth() + 1;
  }

  const competencia = `${vencY}-${String(vencM).padStart(2, "0")}`;
  const cycle = computeInvoiceCycleByCompetencia(competencia, fechamentoDia, vencimentoDia);

  return { competencia, cycle };
}

async function autoCloseIfNeeded(invoiceId: string, fechamento: Date) {
  if (new Date().getTime() > fechamento.getTime()) {
    await prisma.faturaCartao.updateMany({
      where: { id: invoiceId, status: StatusFatura.ABERTA },
      data: { status: StatusFatura.FECHADA },
    });
  }
}

export class CreditCardsService {
  async listCards(userId: string) {
    const items = await prisma.conta.findMany({
      where: { usuarioId: userId, tipo: TipoConta.CARTAO },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nome: true,
        tipo: true,
        fechamentoDia: true,
        vencimentoDia: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { ok: true, items };
  }

  async createCard(userId: string, input: unknown) {
    const data = createCardSchema.parse(input);

    const card = await prisma.conta.create({
      data: {
        nome: data.nome,
        tipo: TipoConta.CARTAO,
        fechamentoDia: data.fechamentoDia,
        vencimentoDia: data.vencimentoDia,
        usuarioId: userId,
      },
      select: {
        id: true,
        nome: true,
        tipo: true,
        fechamentoDia: true,
        vencimentoDia: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { ok: true, card };
  }

  async updateCard(userId: string, cardId: string, input: unknown) {
    const data = updateCardSchema.parse(input);

    const exists = await prisma.conta.findFirst({
      where: { id: cardId, usuarioId: userId, tipo: TipoConta.CARTAO },
      select: { id: true },
    });
    if (!exists) return { ok: false, message: "Cartão não encontrado" };

    const card = await prisma.conta.update({
      where: { id: cardId },
      data: {
        nome: data.nome,
        fechamentoDia: data.fechamentoDia,
        vencimentoDia: data.vencimentoDia,
      },
      select: {
        id: true,
        nome: true,
        tipo: true,
        fechamentoDia: true,
        vencimentoDia: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { ok: true, card };
  }

  async removeCard(userId: string, cardId: string) {
    const exists = await prisma.conta.findFirst({
      where: { id: cardId, usuarioId: userId, tipo: TipoConta.CARTAO },
      select: { id: true },
    });
    if (!exists) return { ok: false, message: "Cartão não encontrado" };

    await prisma.conta.delete({ where: { id: cardId } });
    return { ok: true };
  }

  async getInvoice(userId: string, cardId: string, competencia: string) {
    competenciaSchema.parse(competencia);

    const card = await prisma.conta.findFirst({
      where: { id: cardId, usuarioId: userId },
      select: { id: true, nome: true, tipo: true, fechamentoDia: true, vencimentoDia: true },
    });

    if (!card) return { ok: false, message: "Conta não encontrada" };
    if (card.tipo !== TipoConta.CARTAO) return { ok: false, message: "Conta não é do tipo CARTAO" };
    if (!card.fechamentoDia || !card.vencimentoDia) {
      return { ok: false, message: "Cartão sem fechamentoDia/vencimentoDia configurados" };
    }

    const cycle = computeInvoiceCycleByCompetencia(competencia, card.fechamentoDia, card.vencimentoDia);

    const items = await prisma.transacao.findMany({
      where: {
        usuarioId: userId,
        contaId: cardId,
        tipo: "DESPESA",
        data: { gte: cycle.inicio, lte: cycle.fim },
      },
      orderBy: { data: "asc" },
      include: { categoria: { select: { id: true, nome: true } } },
    });

    let totalPrevisto = 0;
    let totalPago = 0;

    for (const t of items) {
      const v = toNumberDecimal(t.valor);
      totalPrevisto += v;
      if (t.status === StatusPagamento.PAGO) totalPago += v;
    }

    const invoice = await prisma.faturaCartao.upsert({
      where: { contaId_competencia: { contaId: cardId, competencia } },
      update: {
        inicio: cycle.inicio,
        fim: cycle.fim,
        fechamento: cycle.fechamento,
        vencimento: cycle.vencimento,
        totalPrevisto: new Prisma.Decimal(totalPrevisto),
        totalPago: new Prisma.Decimal(totalPago),
      },
      create: {
        usuarioId: userId,
        contaId: cardId,
        competencia,
        inicio: cycle.inicio,
        fim: cycle.fim,
        fechamento: cycle.fechamento,
        vencimento: cycle.vencimento,
        status: StatusFatura.ABERTA,
        totalPrevisto: new Prisma.Decimal(totalPrevisto),
        totalPago: new Prisma.Decimal(totalPago),
      },
    });

    //   Premium: auto-close
    await autoCloseIfNeeded(invoice.id, cycle.fechamento);

    const invoiceAfter = await prisma.faturaCartao.findUnique({
      where: { id: invoice.id },
    });

    return {
      ok: true,
      card,
      competencia,
      cycle: {
        inicio: cycle.inicio,
        fim: cycle.fim,
        fechamento: cycle.fechamento,
        vencimento: cycle.vencimento,
      },
      totals: {
        totalPrevisto,
        totalPago,
        restante: totalPrevisto - totalPago,
      },
      invoice: invoiceAfter,
      items,
    };
  }

  //   Premium: fatura atual (sem competencia)
  async getCurrentInvoice(userId: string, cardId: string) {
    const card = await prisma.conta.findFirst({
      where: { id: cardId, usuarioId: userId },
      select: { id: true, nome: true, tipo: true, fechamentoDia: true, vencimentoDia: true },
    });

    if (!card) return { ok: false, message: "Conta não encontrada" };
    if (card.tipo !== TipoConta.CARTAO) return { ok: false, message: "Conta não é do tipo CARTAO" };
    if (!card.fechamentoDia || !card.vencimentoDia) {
      return { ok: false, message: "Cartão sem fechamentoDia/vencimentoDia configurados" };
    }

    const now = new Date();
    const nowUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds()
      )
    );

    const { competencia } = computeCurrentInvoiceCompetenciaAndCycle(
      nowUTC,
      card.fechamentoDia,
      card.vencimentoDia
    );

    return this.getInvoice(userId, cardId, competencia);
  }

  //   Premium: fecha ABERTAS que já passaram do fechamento
  async closeDueInvoices(userId: string) {
    const open = await prisma.faturaCartao.findMany({
      where: { usuarioId: userId, status: StatusFatura.ABERTA },
      select: { id: true, fechamento: true },
    });

    let closed = 0;

    for (const inv of open) {
      if (new Date().getTime() > inv.fechamento.getTime()) {
        const r = await prisma.faturaCartao.updateMany({
          where: { id: inv.id, status: StatusFatura.ABERTA },
          data: { status: StatusFatura.FECHADA },
        });
        closed += r.count;
      }
    }

    return { ok: true, closed };
  }

  async payInvoice(
    userId: string,
    cardId: string,
    competencia: string,
    opts: { markTransactions: boolean }
  ) {
    competenciaSchema.parse(competencia);

    const current = await this.getInvoice(userId, cardId, competencia);
    if (!current.ok) return current;

    const invoice = (current as any).invoice;
    if (!invoice?.id) return { ok: false, message: "Fatura não encontrada" };

    await prisma.$transaction(async (tx) => {
      await tx.faturaCartao.update({
        where: { id: invoice.id },
        data: { status: StatusFatura.PAGA },
      });

      if (opts.markTransactions) {
        await tx.transacao.updateMany({
          where: {
            usuarioId: userId,
            contaId: cardId,
            tipo: "DESPESA",
            status: StatusPagamento.PENDENTE,
            data: {
              gte: (current as any).cycle.inicio,
              lte: (current as any).cycle.fim,
            },
          },
          data: { status: StatusPagamento.PAGO },
        });
      }
    });

    return this.getInvoice(userId, cardId, competencia);
  }
}
