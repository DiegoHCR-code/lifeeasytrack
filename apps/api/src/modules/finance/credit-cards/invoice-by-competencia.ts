import { prisma } from "@shared/db/prisma";
import { Prisma, StatusFatura, TipoConta } from "@prisma/client";

function utcDate(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0, ms = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss, ms));
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
function computeInvoiceCycleByCompetencia(
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
  const fechamentoAnterior = utcDate(
    fechamentoAnteriorBase.getUTCFullYear(),
    fechamentoAnteriorBase.getUTCMonth(), // já está UTC
    fechamentoAnteriorBase.getUTCDate()
  );

  // volta 1 mês mantendo o dia (UTC)
  const prev = new Date(Date.UTC(fechamentoAnterior.getUTCFullYear(), fechamentoAnterior.getUTCMonth() - 1, fechamentoAnterior.getUTCDate(), 0, 0, 0, 0));

  const inicio = new Date(prev.getTime());
  inicio.setUTCDate(inicio.getUTCDate() + 1);
  inicio.setUTCHours(0, 0, 0, 0);

  const fim = new Date(fechamento.getTime());

  return { inicio, fim, fechamento, vencimento };
}

/**
 * ✅ garante que exista a fatura (conta CARTAO) para a competência informada e retorna ela
 * - se já existir, atualiza ciclo (inicio/fim/fechamento/vencimento)
 * - se não existir, cria ABERTA com totals zerados
 */
export async function ensureInvoiceByCompetencia(userId: string, cardId: string, competencia: string) {
  const card = await prisma.conta.findFirst({
    where: { id: cardId, usuarioId: userId },
    select: { id: true, tipo: true, fechamentoDia: true, vencimentoDia: true },
  });

  if (!card) throw new Error("Cartão não encontrado");
  if (card.tipo !== TipoConta.CARTAO) throw new Error("Conta não é CARTAO");
  if (!card.fechamentoDia || !card.vencimentoDia) {
    throw new Error("Cartão sem fechamentoDia/vencimentoDia");
  }

  const cycle = computeInvoiceCycleByCompetencia(competencia, card.fechamentoDia, card.vencimentoDia);

  const invoice = await prisma.faturaCartao.upsert({
    where: { contaId_competencia: { contaId: cardId, competencia } },
    update: {
      inicio: cycle.inicio,
      fim: cycle.fim,
      fechamento: cycle.fechamento,
      vencimento: cycle.vencimento,
      // ⚠️ não mexe no status aqui (não queremos reabrir/fechar por acidente)
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
      totalPrevisto: new Prisma.Decimal(0),
      totalPago: new Prisma.Decimal(0),
    },
  });

  return invoice;
}
