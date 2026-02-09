import { z } from "zod";
import { prisma } from "@shared/db/prisma";
import { Prisma } from "@prisma/client";

const competenciaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Use "YYYY-MM" (ex: 2026-02)');

const createSchema = z.object({
  competencia: competenciaSchema,
  categoriaId: z.string().uuid(),
  limite: z.number().positive(),
  // opcional: já criar alertas junto
  alertas: z.array(z.number().int().min(1).max(200)).optional(), // ex: [80, 90, 100]
});

const updateSchema = z.object({
  limite: z.number().positive(),
});

const setAlertsSchema = z.object({
  alertas: z.array(z.number().int().min(1).max(200)), // ex: [80,90,100]
});

function monthRange(competencia: string) {
  const [y, m] = competencia.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // próximo mês
  return { start, end };
}

function clampNonNegative(n: number) {
  return n < 0 ? 0 : n;
}

export class BudgetsService {
  async list(userId: string) {
    const items = await prisma.orcamento.findMany({
      where: { usuarioId: userId },
      orderBy: [{ competencia: "desc" }, { createdAt: "desc" }],
      include: {
        categoria: { select: { id: true, nome: true } },
        alertas: { orderBy: { percentual: "asc" } },
      },
    });

    return { ok: true, items };
  }

  async create(userId: string, input: unknown) {
    const data = createSchema.parse(input);

    const cat = await prisma.categoria.findFirst({
      where: { id: data.categoriaId, usuarioId: userId },
    });
    if (!cat) return { ok: false, message: "Categoria inválida" };

    try {
      const budget = await prisma.orcamento.create({
        data: {
          competencia: data.competencia,
          limite: new Prisma.Decimal(data.limite),
          usuarioId: userId,
          categoriaId: data.categoriaId,
          alertas: data.alertas?.length
            ? { create: data.alertas.map((p) => ({ percentual: p })) }
            : undefined,
        },
        include: {
          categoria: { select: { id: true, nome: true } },
          alertas: { orderBy: { percentual: "asc" } },
        },
      });

      return { ok: true, budget };
    } catch (e: any) {
      // unique(userId,categoriaId,competencia)
      if (e?.code === "P2002") {
        return {
          ok: false,
          message: "Já existe orçamento para essa categoria nessa competência",
        };
      }
      throw e;
    }
  }

  async update(userId: string, id: string, input: unknown) {
    const data = updateSchema.parse(input);

    const exists = await prisma.orcamento.findFirst({
      where: { id, usuarioId: userId },
    });
    if (!exists) return { ok: false, message: "Orçamento não encontrado" };

    const budget = await prisma.orcamento.update({
      where: { id },
      data: { limite: new Prisma.Decimal(data.limite) },
      include: {
        categoria: { select: { id: true, nome: true } },
        alertas: { orderBy: { percentual: "asc" } },
      },
    });

    return { ok: true, budget };
  }

  async remove(userId: string, id: string) {
    const exists = await prisma.orcamento.findFirst({
      where: { id, usuarioId: userId },
    });
    if (!exists) return { ok: false, message: "Orçamento não encontrado" };

    await prisma.orcamento.delete({ where: { id } });
    return { ok: true };
  }

  async setAlerts(userId: string, budgetId: string, input: unknown) {
    const data = setAlertsSchema.parse(input);

    const budget = await prisma.orcamento.findFirst({
      where: { id: budgetId, usuarioId: userId },
      include: { alertas: true },
    });
    if (!budget) return { ok: false, message: "Orçamento não encontrado" };

    // substitui a lista de alertas (simples e previsível)
    await prisma.alertaOrcamento.deleteMany({
      where: { orcamentoId: budgetId },
    });

    await prisma.alertaOrcamento.createMany({
      data: data.alertas.map((p) => ({
        orcamentoId: budgetId,
        percentual: p,
        ativo: true,
      })),
    });

    const updated = await prisma.orcamento.findUnique({
      where: { id: budgetId },
      include: {
        categoria: { select: { id: true, nome: true } },
        alertas: { orderBy: { percentual: "asc" } },
      },
    });

    return { ok: true, budget: updated };
  }

  async summary(userId: string, competencia: string) {
    competenciaSchema.parse(competencia);
    const { start, end } = monthRange(competencia);

    const budgets = await prisma.orcamento.findMany({
      where: { usuarioId: userId, competencia },
      include: {
        categoria: { select: { id: true, nome: true } },
        alertas: { where: { ativo: true }, orderBy: { percentual: "asc" } },
      },
    });

    // Busca despesas (PAGO + PENDENTE) no mês
    const despesas = await prisma.transacao.findMany({
      where: {
        usuarioId: userId,
        tipo: "DESPESA",
        status: { in: ["PAGO", "PENDENTE"] },
        data: { gte: start, lt: end },
        categoriaId: { not: null },
      },
      select: { categoriaId: true, valor: true, status: true },
    });

    // soma por categoria separando pago x previsto
    const mapPago = new Map<string, number>();
    const mapPrevisto = new Map<string, number>();

    for (const d of despesas) {
      if (!d.categoriaId) continue;

      const v = Number(d.valor);

      // previsto sempre soma (PAGO + PENDENTE)
      mapPrevisto.set(d.categoriaId, (mapPrevisto.get(d.categoriaId) ?? 0) + v);

      // pago só soma se status = PAGO
      if (d.status === "PAGO") {
        mapPago.set(d.categoriaId, (mapPago.get(d.categoriaId) ?? 0) + v);
      }
    }

    const items = budgets.map((b) => {
      const limite = Number(b.limite);

      const gastoPago = mapPago.get(b.categoriaId) ?? 0;
      const gastoPrevisto = mapPrevisto.get(b.categoriaId) ?? 0;

      const percentualPago =
        limite > 0 ? Math.round((gastoPago / limite) * 100) : 0;
      const percentualPrevisto =
        limite > 0 ? Math.round((gastoPrevisto / limite) * 100) : 0;

      const restantePago = limite - gastoPago;
      const restantePrevisto = limite - gastoPrevisto;

      // Estado baseado no PREVISTO (pago+pendente)
      let estado: "OK" | "ALERTA" | "ESTOURADO" = "OK";
      if (percentualPrevisto >= 100) estado = "ESTOURADO";
      else if (b.alertas.some((a) => percentualPrevisto >= a.percentual))
        estado = "ALERTA";

      // Alertas disparados (baseado no PREVISTO)
      const disparados = b.alertas
        .filter((a) => percentualPrevisto >= a.percentual)
        .map((a) => ({
          percentual: a.percentual,
          message:
            a.percentual >= 100
              ? `Risco de estouro (${percentualPrevisto}%)`
              : `Atenção: ${percentualPrevisto}% previsto`,
        }));

      // Próximo alerta (o menor percentual ainda não atingido)
      const proximo =
        b.alertas.find((a) => percentualPrevisto < a.percentual)?.percentual ??
        null;

      // Quanto falta (em R$) para bater o próximo alerta
      const valorParaProximoAlerta =
        proximo && limite > 0
          ? clampNonNegative((limite * proximo) / 100 - gastoPrevisto)
          : null;

      return {
        id: b.id,
        competencia: b.competencia,
        categoria: b.categoria,
        limite,

        gastoPago,
        gastoPrevisto,

        restantePago,
        restantePrevisto,

        percentualPago,
        percentualPrevisto,

        estado,

        alertas: b.alertas.map((a) => a.percentual),
        disparados,

        proximoAlerta: proximo,
        valorParaProximoAlerta,
      };
    });

    // ===== Resumo geral do mês (premium) =====
    const totalLimite = items.reduce((acc, i) => acc + i.limite, 0);
    const totalPago = items.reduce((acc, i) => acc + i.gastoPago, 0);
    const totalPrevisto = items.reduce((acc, i) => acc + i.gastoPrevisto, 0);

    const totalRestantePago = totalLimite - totalPago;
    const totalRestantePrevisto = totalLimite - totalPrevisto;

    const percentualGeralPago =
      totalLimite > 0 ? Math.round((totalPago / totalLimite) * 100) : 0;
    const percentualGeralPrevisto =
      totalLimite > 0 ? Math.round((totalPrevisto / totalLimite) * 100) : 0;

    const categoriasEmAlerta = items.filter((i) => i.estado === "ALERTA").length;
    const categoriasEstouradas = items.filter(
      (i) => i.estado === "ESTOURADO"
    ).length;

    let estadoGeral: "OK" | "ALERTA" | "ESTOURADO" = "OK";
    if (percentualGeralPrevisto >= 100) estadoGeral = "ESTOURADO";
    else if (categoriasEmAlerta > 0 || categoriasEstouradas > 0)
      estadoGeral = "ALERTA";

    const resumoGeral = {
      competencia,
      totalLimite,
      totalPago,
      totalPrevisto,
      totalRestantePago,
      totalRestantePrevisto,
      percentualGeralPago,
      percentualGeralPrevisto,
      estadoGeral,
      categoriasEmAlerta,
      categoriasEstouradas,
    };

    return { ok: true, competencia, resumoGeral, items };
  }
}
