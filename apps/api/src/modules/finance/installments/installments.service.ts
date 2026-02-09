import { z } from "zod";
import { prisma } from "@shared/db/prisma";
import { Prisma, StatusPagamento } from "@prisma/client";

const competenciaSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Use "YYYY-MM" (ex: 2026-02)');

const createPlanSchema = z.object({
  descricao: z.string().min(2),
  total: z.number().positive(),
  numeroParcelas: z.number().int().min(2).max(60),
  primeiraCompetencia: competenciaSchema,
  categoriaId: z.string().uuid().optional().nullable(),
  contaId: z.string().uuid().optional().nullable(),
  vencimentoDia: z.number().int().min(1).max(28).optional(), // opcional
  metodoPagamento: z.string().min(2).optional(),
  estabelecimento: z.string().min(2).optional(),
});

function addMonths(competencia: string, add: number) {
  const [y, m] = competencia.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + add, 1, 0, 0, 0));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function competenceToDate(competencia: string, dia?: number) {
  const [y, m] = competencia.split("-").map(Number);
  const day = dia ?? 1;
  return new Date(Date.UTC(y, m - 1, day, 0, 0, 0));
}

export class InstallmentsService {
  async listPlans(userId: string) {
    const items = await prisma.planoParcelamento.findMany({
      where: { usuarioId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        categoria: { select: { id: true, nome: true } },
        conta: { select: { id: true, nome: true } },
        parcelas: {
          orderBy: { numero: "asc" },
          include: { transacao: true },
        },
      },
    });

    return { ok: true, items };
  }

  async getPlan(userId: string, id: string) {
    const plan = await prisma.planoParcelamento.findFirst({
      where: { id, usuarioId: userId },
      include: {
        categoria: { select: { id: true, nome: true } },
        conta: { select: { id: true, nome: true } },
        parcelas: { orderBy: { numero: "asc" }, include: { transacao: true } },
      },
    });

    if (!plan) return { ok: false, message: "Plano de parcelamento não encontrado" };
    return { ok: true, plan };
  }

  async createPlan(userId: string, input: unknown) {
    const data = createPlanSchema.parse(input);

    // valida ownership categoria/conta, se informadas
    if (data.categoriaId) {
      const cat = await prisma.categoria.findFirst({ where: { id: data.categoriaId, usuarioId: userId } });
      if (!cat) return { ok: false, message: "Categoria inválida" };
    }

    if (data.contaId) {
      const conta = await prisma.conta.findFirst({ where: { id: data.contaId, usuarioId: userId } });
      if (!conta) return { ok: false, message: "Conta inválida" };
    }

    const valorParcela = Number((data.total / data.numeroParcelas).toFixed(2));

    // Ajuste simples de centavos: última parcela recebe diferença
    const totalCalculado = valorParcela * data.numeroParcelas;
    const diff = Number((data.total - totalCalculado).toFixed(2));

    const created = await prisma.$transaction(async (tx) => {
      const plano = await tx.planoParcelamento.create({
        data: {
          descricao: data.descricao,
          total: new Prisma.Decimal(data.total),
          numeroParcelas: data.numeroParcelas,
          primeiraCompetencia: data.primeiraCompetencia,
          usuarioId: userId,
          categoriaId: data.categoriaId ?? null,
          contaId: data.contaId ?? null,
          metodoPagamento: data.metodoPagamento,
          estabelecimento: data.estabelecimento,
        },
      });

      // cria parcelas + transações vinculadas
      for (let i = 0; i < data.numeroParcelas; i++) {
        const numero = i + 1;
        const competencia = addMonths(data.primeiraCompetencia, i);
        const valor = numero === data.numeroParcelas ? Number((valorParcela + diff).toFixed(2)) : valorParcela;

        const transacao = await tx.transacao.create({
          data: {
            descricao: `${data.descricao} (${numero}/${data.numeroParcelas})`,
            valor: new Prisma.Decimal(valor),
            data: competenceToDate(competencia, data.vencimentoDia), // data da parcela (pode ser 1º dia do mês)
            tipo: "DESPESA",
            status: "PENDENTE",
            usuarioId: userId,
            categoriaId: data.categoriaId ?? null,
            contaId: data.contaId ?? null,
          },
        });

        await tx.parcela.create({
          data: {
            numero,
            competencia,
            valor: new Prisma.Decimal(valor),
            vencimento: data.vencimentoDia ? competenceToDate(competencia, data.vencimentoDia) : null,
            planoId: plano.id,
            transacaoId: transacao.id,
          },
        });
      }

      return plano;
    });

    const planFull = await prisma.planoParcelamento.findUnique({
      where: { id: created.id },
      include: {
        categoria: { select: { id: true, nome: true } },
        conta: { select: { id: true, nome: true } },
        parcelas: { orderBy: { numero: "asc" }, include: { transacao: true } },
      },
    });

    return { ok: true, plan: planFull };
  }

  async removePlan(userId: string, id: string) {
    const plan = await prisma.planoParcelamento.findFirst({
      where: { id, usuarioId: userId },
      include: { parcelas: true },
    });

    if (!plan) return { ok: false, message: "Plano não encontrado" };

    // Ao deletar o plano, parcelas deletam por cascade.
    // Mas precisamos deletar também as transações vinculadas (porque parcela tem relação com transacao).
    await prisma.$transaction(async (tx) => {
      const parcelas = await tx.parcela.findMany({ where: { planoId: id }, select: { transacaoId: true } });

      await tx.parcela.deleteMany({ where: { planoId: id } });
      await tx.planoParcelamento.delete({ where: { id } });
      await tx.transacao.deleteMany({ where: { id: { in: parcelas.map((p) => p.transacaoId) } } });
    });

    return { ok: true };
  }

  async setInstallmentStatus(userId: string, parcelaId: string, status: StatusPagamento) {
    const parcela = await prisma.parcela.findFirst({
      where: { id: parcelaId, plano: { usuarioId: userId } },
      include: { transacao: true },
    });

    if (!parcela) return { ok: false, message: "Parcela não encontrada" };

    const updated = await prisma.transacao.update({
      where: { id: parcela.transacaoId },
      data: { status },
    });

    return { ok: true, transaction: updated };
  }
}
