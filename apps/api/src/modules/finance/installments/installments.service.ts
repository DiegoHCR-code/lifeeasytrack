import { z } from "zod";
import { prisma } from "@shared/db/prisma";
import {
  OrigemTransacao,
  Prisma,
  StatusFatura,
  StatusPagamento,
  StatusParcela,
  StatusPlanoParcelamento,
  TipoConta,
} from "@prisma/client";
import { CreditCardInvoicesService } from "@modules/finance/credit-cards/credit-card-invoices.service";
import { ensureInvoiceByCompetencia } from "@modules/finance/credit-cards/invoice-by-competencia";
const competenciaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Use "YYYY-MM" (ex: 2026-02)');

const createPlanSchema = z.object({
  descricao: z.string().min(2),
  total: z.number().positive(),
  numeroParcelas: z.number().int().min(2).max(240),
  primeiraCompetencia: competenciaSchema,

  contaId: z.string().uuid(),
  categoriaId: z.string().uuid().optional().nullable(),

  metodoPagamento: z.string().optional().nullable(),
  estabelecimento: z.string().optional().nullable(),
});

const anticipateSchema = z.object({
  count: z.number().int().min(1).max(240).optional(),
  numeros: z.array(z.number().int().min(1)).optional(),
  moveToCurrentInvoice: z.boolean().optional().default(true),
});

const cancelSchema = z.object({
  motivo: z.string().min(3),
});

function addCompetencia(c: string, add: number) {
  const [y, m] = c.split("-").map(Number);
  const base = y * 12 + (m - 1);
  const t = base + add;
  const ny = Math.floor(t / 12);
  const nm = (t % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function splitInstallments(total: number, n: number) {
  const base = Math.floor((total / n) * 100) / 100;
  const values = Array.from({ length: n }, () => base);
  const sum = values.reduce((a, b) => a + b, 0);
  const diff = Math.round((total - sum) * 100) / 100;
  values[n - 1] = Math.round((values[n - 1] + diff) * 100) / 100;
  return values;
}

function invoiceIsClosedOrPaid(status: StatusFatura) {
  return status === StatusFatura.FECHADA || status === StatusFatura.PAGA;
}

export class InstallmentsService {
  async listPlans(userId: string) {
    const items = await prisma.planoParcelamento.findMany({
      where: { usuarioId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        conta: { select: { id: true, nome: true, tipo: true } },
        categoria: { select: { id: true, nome: true } },
        _count: { select: { parcelas: true } },
      },
    });

    return { ok: true, items };
  }

  async getPlan(userId: string, planId: string) {
    const plan = await prisma.planoParcelamento.findFirst({
      where: { id: planId, usuarioId: userId },
      include: {
        conta: { select: { id: true, nome: true, tipo: true } },
        categoria: { select: { id: true, nome: true } },
        parcelas: {
          orderBy: { numero: "asc" },
          include: {
            transacao: {
              select: {
                id: true,
                data: true,
                status: true,
                faturaCartao: {
                  select: { id: true, competencia: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    if (!plan)
      return { ok: false, statusCode: 404, message: "Plano não encontrado" };
    return { ok: true, plan };
  }

  /**
   * ✅ cria o plano + parcelas + transações já caindo na fatura correta
   */
  async createPlan(userId: string, input: unknown) {
    const data = createPlanSchema.parse(input);

    const conta = await prisma.conta.findFirst({
      where: { id: data.contaId, usuarioId: userId },
      select: { id: true, tipo: true },
    });

    if (!conta)
      return { ok: false, statusCode: 400, message: "Conta inválida" };
    if (conta.tipo !== TipoConta.CARTAO) {
      return {
        ok: false,
        statusCode: 400,
        message: "Parcelamento exige conta tipo CARTAO",
      };
    }

    if (data.categoriaId) {
      const cat = await prisma.categoria.findFirst({
        where: { id: data.categoriaId, usuarioId: userId },
      });
      if (!cat)
        return { ok: false, statusCode: 400, message: "Categoria inválida" };
    }

    const values = splitInstallments(data.total, data.numeroParcelas);

    const created = await prisma.$transaction(async (tx) => {
      const plan = await tx.planoParcelamento.create({
        data: {
          usuarioId: userId,
          descricao: data.descricao,
          total: new Prisma.Decimal(data.total),
          numeroParcelas: data.numeroParcelas,
          primeiraCompetencia: data.primeiraCompetencia,
          metodoPagamento: data.metodoPagamento ?? null,
          estabelecimento: data.estabelecimento ?? null,
          contaId: data.contaId,
          categoriaId: data.categoriaId ?? null,
          status: StatusPlanoParcelamento.ATIVO,
        },
      });

      const parcelas = [];

      for (let i = 0; i < data.numeroParcelas; i++) {
        const numero = i + 1;
        const competencia = addCompetencia(data.primeiraCompetencia, i);
        const valor = values[i];

        // ✅ garante fatura do mês
        const invoice = await ensureInvoiceByCompetencia(
          userId,
          data.contaId,
          competencia,
        );

        // ✅ transação dentro do ciclo => cai na fatura correta
        const transacao = await tx.transacao.create({
          data: {
            usuarioId: userId,
            descricao: `${data.descricao} (${numero}/${data.numeroParcelas})`,
            valor: new Prisma.Decimal(valor),
            data: new Date(invoice.inicio),
            tipo: "DESPESA",
            status: StatusPagamento.PENDENTE,
            contaId: data.contaId,
            categoriaId: data.categoriaId ?? null,
            origem: OrigemTransacao.PARCELA,
            faturaCartaoId: invoice.id,
          },
        });

        const parcela = await tx.parcela.create({
          data: {
            planoId: plan.id,
            numero,
            competencia,
            valor: new Prisma.Decimal(valor),
            status: StatusParcela.PENDENTE,
            transacaoId: transacao.id,
          },
        });

        parcelas.push(parcela);
      }

      return { plan, parcelas };
    });

    return { ok: true, ...created };
  }

  /**
   * ✅ Antecipação:
   * - marca parcela PAGA
   * - marca transação PAGO
   * - opcional: move para a fatura ABERTA atual
   */
  async anticipate(userId: string, planId: string, input: unknown) {
    const opts = anticipateSchema.parse(input);

    const plan = await prisma.planoParcelamento.findFirst({
      where: { id: planId, usuarioId: userId },
      include: { conta: { select: { id: true, tipo: true } } },
    });

    if (!plan)
      return { ok: false, statusCode: 404, message: "Plano não encontrado" };
    if (plan.status !== StatusPlanoParcelamento.ATIVO)
      return { ok: false, statusCode: 409, message: "Plano não está ATIVO" };
    if (!plan.contaId || plan.conta?.tipo !== TipoConta.CARTAO)
      return {
        ok: false,
        statusCode: 400,
        message: "Plano exige conta CARTAO",
      };

    const pending = await prisma.parcela.findMany({
      where: { planoId: planId, status: StatusParcela.PENDENTE },
      orderBy: { numero: "asc" },
      include: { transacao: { include: { faturaCartao: true } } },
    });

    if (!pending.length)
      return { ok: false, statusCode: 409, message: "Sem parcelas pendentes" };

    let selected = pending;

    if (opts.numeros?.length) {
      const set = new Set(opts.numeros);
      selected = pending.filter((p) => set.has(p.numero));
    } else if (opts.count) {
      selected = pending.slice(0, opts.count);
    } else {
      selected = pending.slice(0, 1);
    }

    // garante fatura aberta atual se moveToCurrentInvoice
    let currentInvoice: { id: string; inicio: Date } | null = null;

    if (opts.moveToCurrentInvoice) {
      const invoicesSvc = new CreditCardInvoicesService();
      const cur = await invoicesSvc.getCurrentInvoice(userId, plan.contaId);
      if (!cur.ok) return cur as any;

      if (cur.invoice) {
        currentInvoice = { id: cur.invoice.id, inicio: cur.invoice.inicio };
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        for (const p of selected) {
          await tx.parcela.update({
            where: { id: p.id },
            data: { status: StatusParcela.PAGA },
          });

          if (!p.transacaoId) continue;

          const st = p.transacao?.faturaCartao?.status;
          if (st && invoiceIsClosedOrPaid(st)) {
            throw new Error(
              `Parcela ${p.numero} está em fatura FECHADA/PAGA e não pode ser antecipada`,
            );
          }

          await tx.transacao.update({
            where: { id: p.transacaoId },
            data: {
              status: StatusPagamento.PAGO,
              ...(currentInvoice
                ? {
                    faturaCartaoId: currentInvoice.id,
                    data: new Date(currentInvoice.inicio),
                  }
                : {}),
            },
          });
        }
      });
    } catch (e: any) {
      return {
        ok: false,
        statusCode: 409,
        message: e?.message ?? "Falha ao antecipar parcelas",
      };
    }

    return { ok: true, antecipadas: selected.map((s) => s.numero) };
  }

  /**
   * ✅ Cancelamento:
   * - marca plano CANCELADO
   * - cancela parcelas pendentes
   * - remove transações (pra não entrar no fluxo)
   * - bloqueia se alguma estiver em fatura FECHADA/PAGA
   */
  async cancelPlan(userId: string, planId: string, input: unknown) {
    const data = cancelSchema.parse(input);

    const plan = await prisma.planoParcelamento.findFirst({
      where: { id: planId, usuarioId: userId },
    });

    if (!plan)
      return { ok: false, statusCode: 404, message: "Plano não encontrado" };
    if (plan.status === StatusPlanoParcelamento.CANCELADO)
      return { ok: false, statusCode: 409, message: "Plano já está CANCELADO" };

    const pending = await prisma.parcela.findMany({
      where: { planoId: planId, status: StatusParcela.PENDENTE },
      include: { transacao: { include: { faturaCartao: true } } },
      orderBy: { numero: "asc" },
    });

    const blocked = pending.filter((p) => {
      const st = p.transacao?.faturaCartao?.status;
      return st ? invoiceIsClosedOrPaid(st) : false;
    });

    if (blocked.length) {
      return {
        ok: false,
        statusCode: 409,
        message:
          "Não é possível cancelar: existem parcelas em fatura FECHADA/PAGA",
        blockedParcelas: blocked.map((b) => b.numero),
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.planoParcelamento.update({
        where: { id: planId },
        data: {
          status: StatusPlanoParcelamento.CANCELADO,
          canceladoEm: new Date(),
          canceladoMotivo: data.motivo,
        },
      });

      for (const p of pending) {
        if (p.transacaoId) {
          await tx.transacao.delete({ where: { id: p.transacaoId } });
        }

        await tx.parcela.update({
          where: { id: p.id },
          data: { status: StatusParcela.CANCELADA, transacaoId: null },
        });
      }
    });

    return { ok: true, canceledParcelas: pending.map((p) => p.numero) };
  }
}
