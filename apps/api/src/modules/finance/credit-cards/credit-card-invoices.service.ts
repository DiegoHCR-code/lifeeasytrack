import { prisma } from "@shared/db/prisma";
import { Prisma, StatusFatura, StatusPagamento, TipoConta } from "@prisma/client";

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

function formatCompetencia(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function nextCompetencia(competencia: string) {
  const { y, m } = parseCompetencia(competencia);
  if (m === 12) return formatCompetencia(y + 1, 1);
  return formatCompetencia(y, m + 1);
}

function compareCompetencia(a: string, b: string) {
  // retorna -1 se a < b, 0 se igual, 1 se a > b
  const pa = parseCompetencia(a);
  const pb = parseCompetencia(b);
  const va = pa.y * 100 + pa.m;
  const vb = pb.y * 100 + pb.m;
  return va === vb ? 0 : va < vb ? -1 : 1;
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
  const fechamentoAnterior = addMonthsUTC(fechamentoAnteriorBase, -1);

  const inicio = new Date(fechamentoAnterior.getTime());
  inicio.setUTCDate(inicio.getUTCDate() + 1);
  inicio.setUTCHours(0, 0, 0, 0);

  const fim = new Date(fechamento.getTime());
  return { inicio, fim, fechamento, vencimento };
}

function computeCurrentInvoiceCompetencia(nowUTC: Date, fechamentoDia: number, vencimentoDia: number) {
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

  // vencimento normalmente no mesmo mês do fechamento,
  // mas se vencimentoDia <= fechamentoDia => mês seguinte
  let vencY = fechamentoY;
  let vencM = fechamentoM;

  if (vencimentoDia <= fechamentoDia) {
    const next = addMonthsUTC(utcDate(fechamentoY, fechamentoM, 1), 1);
    vencY = next.getUTCFullYear();
    vencM = next.getUTCMonth() + 1;
  }

  return formatCompetencia(vencY, vencM);
}

async function recalcTotalsForInvoice(userId: string, cardId: string, inicio: Date, fim: Date) {
  const [sumPrev, sumPago] = await Promise.all([
    prisma.transacao.aggregate({
      where: {
        usuarioId: userId,
        contaId: cardId,
        tipo: "DESPESA",
        data: { gte: inicio, lte: fim },
      },
      _sum: { valor: true },
    }),
    prisma.transacao.aggregate({
      where: {
        usuarioId: userId,
        contaId: cardId,
        tipo: "DESPESA",
        status: StatusPagamento.PAGO,
        data: { gte: inicio, lte: fim },
      },
      _sum: { valor: true },
    }),
  ]);

  const totalPrevisto = Number(sumPrev._sum.valor ?? 0);
  const totalPago = Number(sumPago._sum.valor ?? 0);

  return { totalPrevisto, totalPago };
}

export class CreditCardInvoicesService {
  /**
   *   UPGRADE DEFINITIVO:
   * - autocorrige lacunas
   * - fecha faturas antigas automaticamente
   * - garante fatura atual e próxima
   */
  async getCurrentInvoice(userId: string, cardId: string) {
    const card = await prisma.conta.findFirst({
      where: { id: cardId, usuarioId: userId },
      select: { id: true, nome: true, tipo: true, fechamentoDia: true, vencimentoDia: true },
    });

    if (!card) return { ok: false, message: "Cartão não encontrado" };
    if (card.tipo !== TipoConta.CARTAO) return { ok: false, message: "Conta não é CARTAO" };
    if (!card.fechamentoDia || !card.vencimentoDia) {
      return { ok: false, message: "Cartão sem fechamentoDia/vencimentoDia" };
    }

    const now = new Date();
    const nowUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );

    const currentCompetencia = computeCurrentInvoiceCompetencia(
      nowUTC,
      card.fechamentoDia,
      card.vencimentoDia
    );

    // 1) Descobre a fatura mais recente existente (por competencia)
    const last = await prisma.faturaCartao.findFirst({
      where: { usuarioId: userId, contaId: cardId },
      orderBy: { competencia: "desc" },
      select: { competencia: true },
    });

    // 2) Se tem lacuna, cria as competências faltando até chegar na atual
    let cursor = last?.competencia;

    if (!cursor) {
      cursor = currentCompetencia;
      const cycle = computeInvoiceCycleByCompetencia(cursor, card.fechamentoDia, card.vencimentoDia);

      await prisma.faturaCartao.upsert({
        where: { contaId_competencia: { contaId: cardId, competencia: cursor } },
        update: {
          inicio: cycle.inicio,
          fim: cycle.fim,
          fechamento: cycle.fechamento,
          vencimento: cycle.vencimento,
          status: StatusFatura.ABERTA,
        },
        create: {
          usuarioId: userId,
          contaId: cardId,
          competencia: cursor,
          inicio: cycle.inicio,
          fim: cycle.fim,
          fechamento: cycle.fechamento,
          vencimento: cycle.vencimento,
          status: StatusFatura.ABERTA,
          totalPrevisto: new Prisma.Decimal(0),
          totalPago: new Prisma.Decimal(0),
        },
      });
    } else {
      // cria do mês seguinte ao last até alcançar a currentCompetencia
      let next = nextCompetencia(cursor);

      while (compareCompetencia(next, currentCompetencia) <= 0) {
        const cycle = computeInvoiceCycleByCompetencia(next, card.fechamentoDia, card.vencimentoDia);

        await prisma.faturaCartao.upsert({
          where: { contaId_competencia: { contaId: cardId, competencia: next } },
          update: {
            inicio: cycle.inicio,
            fim: cycle.fim,
            fechamento: cycle.fechamento,
            vencimento: cycle.vencimento,
          },
          create: {
            usuarioId: userId,
            contaId: cardId,
            competencia: next,
            inicio: cycle.inicio,
            fim: cycle.fim,
            fechamento: cycle.fechamento,
            vencimento: cycle.vencimento,
            status: StatusFatura.ABERTA,
            totalPrevisto: new Prisma.Decimal(0),
            totalPago: new Prisma.Decimal(0),
          },
        });

        next = nextCompetencia(next);
      }
    }

    // 3) Fecha automaticamente quaisquer faturas ABERTAS cujo fechamento já passou (não mexe em PAGA)
    await prisma.faturaCartao.updateMany({
      where: {
        usuarioId: userId,
        contaId: cardId,
        status: StatusFatura.ABERTA,
        fechamento: { lt: new Date() },
      },
      data: { status: StatusFatura.FECHADA },
    });

    // 4) Garante que a fatura atual exista, e atualiza totals
    const currentCycle = computeInvoiceCycleByCompetencia(
      currentCompetencia,
      card.fechamentoDia,
      card.vencimentoDia
    );

    const totals = await recalcTotalsForInvoice(userId, cardId, currentCycle.inicio, currentCycle.fim);

    // ⚠️ Prisma não gosta de "status: undefined" em update.
    // então montamos o objeto de update dinamicamente.
    const updateData: Prisma.FaturaCartaoUpdateInput = {
      inicio: currentCycle.inicio,
      fim: currentCycle.fim,
      fechamento: currentCycle.fechamento,
      vencimento: currentCycle.vencimento,
      totalPrevisto: new Prisma.Decimal(totals.totalPrevisto),
      totalPago: new Prisma.Decimal(totals.totalPago),
    };

    // se por algum motivo virou FECHADA e ainda não passou do fechamento, reabre (raro)
    if (new Date().getTime() <= currentCycle.fechamento.getTime()) {
      updateData.status = StatusFatura.ABERTA;
    }

    const currentInvoice = await prisma.faturaCartao.upsert({
      where: { contaId_competencia: { contaId: cardId, competencia: currentCompetencia } },
      update: updateData,
      create: {
        usuarioId: userId,
        contaId: cardId,
        competencia: currentCompetencia,
        inicio: currentCycle.inicio,
        fim: currentCycle.fim,
        fechamento: currentCycle.fechamento,
        vencimento: currentCycle.vencimento,
        status: StatusFatura.ABERTA,
        totalPrevisto: new Prisma.Decimal(totals.totalPrevisto),
        totalPago: new Prisma.Decimal(totals.totalPago),
      },
    });

    // 5) Garante a próxima fatura ABERTA (sempre)
    const nextComp = nextCompetencia(currentCompetencia);
    const nextCycle = computeInvoiceCycleByCompetencia(nextComp, card.fechamentoDia, card.vencimentoDia);

    await prisma.faturaCartao.upsert({
      where: { contaId_competencia: { contaId: cardId, competencia: nextComp } },
      update: {
        status: StatusFatura.ABERTA,
        inicio: nextCycle.inicio,
        fim: nextCycle.fim,
        fechamento: nextCycle.fechamento,
        vencimento: nextCycle.vencimento,
      },
      create: {
        usuarioId: userId,
        contaId: cardId,
        competencia: nextComp,
        inicio: nextCycle.inicio,
        fim: nextCycle.fim,
        fechamento: nextCycle.fechamento,
        vencimento: nextCycle.vencimento,
        status: StatusFatura.ABERTA,
        totalPrevisto: new Prisma.Decimal(0),
        totalPago: new Prisma.Decimal(0),
      },
    });

    // 6) Busca a próxima para retornar no payload
    const nextInvoice = await prisma.faturaCartao.findUnique({
      where: { contaId_competencia: { contaId: cardId, competencia: nextComp } },
    });

    return {
      ok: true,
      card: { id: card.id, nome: card.nome },
      competencia: currentCompetencia,
      cycle: currentCycle,
      invoice: currentInvoice,
      nextInvoice,
      totals: {
        totalPrevisto: totals.totalPrevisto,
        totalPago: totals.totalPago,
        restante: totals.totalPrevisto - totals.totalPago,
      },
      autoFix: {
        ensuredCurrent: true,
        ensuredNext: true,
        autoClosedOlderOpenInvoices: true,
      },
    };
  }

  /**
   *   FECHA O CICLO:
   * - marca fatura como PAGA
   * - opcional: marca transações do ciclo como PAGO
   * - recalcula totals
   * - garante a próxima fatura ABERTA
   */
  async payInvoice(
    userId: string,
    cardId: string,
    invoiceId: string,
    opts: { markTransactions: boolean }
  ) {
    const card = await prisma.conta.findFirst({
      where: { id: cardId, usuarioId: userId },
      select: { id: true, tipo: true, fechamentoDia: true, vencimentoDia: true },
    });

    if (!card) return { ok: false, statusCode: 404, message: "Cartão não encontrado" };
    if (card.tipo !== TipoConta.CARTAO) {
      return { ok: false, statusCode: 400, message: "Conta não é do tipo CARTAO" };
    }
    if (!card.fechamentoDia || !card.vencimentoDia) {
      return { ok: false, statusCode: 400, message: "Cartão sem fechamentoDia/vencimentoDia" };
    }

    const invoice = await prisma.faturaCartao.findFirst({
      where: { id: invoiceId, usuarioId: userId, contaId: cardId },
      select: { id: true, status: true, inicio: true, fim: true, competencia: true, fechamento: true },
    });

    if (!invoice) return { ok: false, statusCode: 404, message: "Fatura não encontrada" };

    const nextComp = nextCompetencia(invoice.competencia);
    const nextCycle = computeInvoiceCycleByCompetencia(nextComp, card.fechamentoDia, card.vencimentoDia);

    // idempotente: já paga -> garante próxima e retorna
    if (invoice.status === StatusFatura.PAGA) {
      const ensuredNext = await prisma.faturaCartao.upsert({
        where: { contaId_competencia: { contaId: cardId, competencia: nextComp } },
        update: {
          status: StatusFatura.ABERTA,
          inicio: nextCycle.inicio,
          fim: nextCycle.fim,
          fechamento: nextCycle.fechamento,
          vencimento: nextCycle.vencimento,
        },
        create: {
          usuarioId: userId,
          contaId: cardId,
          competencia: nextComp,
          inicio: nextCycle.inicio,
          fim: nextCycle.fim,
          fechamento: nextCycle.fechamento,
          vencimento: nextCycle.vencimento,
          status: StatusFatura.ABERTA,
          totalPrevisto: new Prisma.Decimal(0),
          totalPago: new Prisma.Decimal(0),
        },
      });

      return {
        ok: true,
        message: "Fatura já estava paga (ciclo garantido)",
        paidInvoice: invoice,
        nextInvoice: ensuredNext,
        nextCompetencia: nextComp,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Se estava ABERTA e já passou do fechamento, fecha antes (consistência)
      if (invoice.status === StatusFatura.ABERTA && new Date().getTime() > invoice.fechamento.getTime()) {
        await tx.faturaCartao.update({
          where: { id: invoice.id },
          data: { status: StatusFatura.FECHADA },
        });
      }

      // opcional: marca transações do ciclo como pagas
      if (opts.markTransactions) {
        await tx.transacao.updateMany({
          where: {
            usuarioId: userId,
            contaId: cardId,
            tipo: "DESPESA",
            data: { gte: invoice.inicio, lte: invoice.fim },
            status: StatusPagamento.PENDENTE,
          },
          data: { status: StatusPagamento.PAGO },
        });
      }

      // recalcula totals (previsto e pago)
      const [sumPrev, sumPago] = await Promise.all([
        tx.transacao.aggregate({
          where: {
            usuarioId: userId,
            contaId: cardId,
            tipo: "DESPESA",
            data: { gte: invoice.inicio, lte: invoice.fim },
          },
          _sum: { valor: true },
        }),
        tx.transacao.aggregate({
          where: {
            usuarioId: userId,
            contaId: cardId,
            tipo: "DESPESA",
            status: StatusPagamento.PAGO,
            data: { gte: invoice.inicio, lte: invoice.fim },
          },
          _sum: { valor: true },
        }),
      ]);

      const totalPrevisto = Number(sumPrev._sum.valor ?? 0);
      const totalPago = Number(sumPago._sum.valor ?? 0);

      // marca fatura como paga + atualiza totals
      const paidInvoice = await tx.faturaCartao.update({
        where: { id: invoice.id },
        data: {
          status: StatusFatura.PAGA,
          totalPrevisto: new Prisma.Decimal(totalPrevisto),
          totalPago: new Prisma.Decimal(totalPago),
        },
      });

      // garante próxima fatura aberta
      const nextInvoice = await tx.faturaCartao.upsert({
        where: { contaId_competencia: { contaId: cardId, competencia: nextComp } },
        update: {
          status: StatusFatura.ABERTA,
          inicio: nextCycle.inicio,
          fim: nextCycle.fim,
          fechamento: nextCycle.fechamento,
          vencimento: nextCycle.vencimento,
        },
        create: {
          usuarioId: userId,
          contaId: cardId,
          competencia: nextComp,
          inicio: nextCycle.inicio,
          fim: nextCycle.fim,
          fechamento: nextCycle.fechamento,
          vencimento: nextCycle.vencimento,
          status: StatusFatura.ABERTA,
          totalPrevisto: new Prisma.Decimal(0),
          totalPago: new Prisma.Decimal(0),
        },
      });

      return { paidInvoice, nextInvoice, totalPrevisto, totalPago };
    });

    return {
      ok: true,
      message: "Fatura paga e próxima fatura aberta garantida",
      paidInvoice: result.paidInvoice,
      nextInvoice: result.nextInvoice,
      nextCompetencia: nextComp,
      totals: {
        totalPrevisto: result.totalPrevisto,
        totalPago: result.totalPago,
        restante: result.totalPrevisto - result.totalPago,
      },
    };
  }
}
