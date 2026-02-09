import { z } from "zod";
import { prisma } from "@shared/db/prisma";
import { Prisma } from "@prisma/client";
import { resolveCardPostingDate } from "@shared/finance/cardInvoiceCycle";

const createSchema = z.object({
  descricao: z.string().min(2),
  valor: z.number().positive(),
  data: z.string(),
  tipo: z.enum(["RECEITA", "DESPESA"]),
  status: z.enum(["PAGO", "PENDENTE"]).optional(),
  categoriaId: z.string().uuid().optional().nullable(),
  contaId: z.string().uuid().optional().nullable(),
});

const updateSchema = createSchema.partial();

function parseDate(input: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(input + "T00:00:00.000Z");
  }
  return new Date(input);
}

export class TransactionsService {
  async list(userId: string) {
    const items = await prisma.transacao.findMany({
      where: { usuarioId: userId },
      orderBy: { data: "desc" },
      include: {
        categoria: { select: { id: true, nome: true } },
        conta: { select: { id: true, nome: true } },
      },
    });

    return { ok: true, items };
  }

  async create(
    userId: string,
    input: unknown,
    opts?: { cardBehavior?: "SHIFT" | "BLOCK" }
  ) {
    const data = createSchema.parse(input);

    // valida categoria
    if (data.categoriaId) {
      const cat = await prisma.categoria.findFirst({
        where: { id: data.categoriaId, usuarioId: userId },
      });
      if (!cat) return { ok: false, statusCode: 400, message: "Categoria inválida" };
    }

    // valida conta
    if (data.contaId) {
      const acc = await prisma.conta.findFirst({
        where: { id: data.contaId, usuarioId: userId },
      });
      if (!acc) return { ok: false, statusCode: 400, message: "Conta inválida" };
    }

    const intendedDate = parseDate(data.data);
    let finalDate = intendedDate;
    let cardPolicy: any = null;

    // 🔥 UPGRADE PREMIUM — cartão + ciclo de fatura
    if (data.contaId) {
      const resolved = await resolveCardPostingDate({
        userId,
        contaId: data.contaId,
        intendedDate,
        behavior: opts?.cardBehavior ?? "SHIFT",
      });

      if (!resolved.ok) {
        return {
          ok: false,
          statusCode: 409,
          message: resolved.message,
        };
      }

      finalDate = resolved.date;
      cardPolicy = {
        behavior: opts?.cardBehavior ?? "SHIFT",
        shifted: resolved.shifted,
        fromCompetencia: resolved.competencia,
        invoiceStatus: resolved.status,
      };
    }

    const created = await prisma.transacao.create({
      data: {
        descricao: data.descricao,
        valor: new Prisma.Decimal(data.valor),
        data: finalDate,
        tipo: data.tipo,
        status: data.status ?? "PENDENTE",
        usuarioId: userId,
        categoriaId: data.categoriaId ?? null,
        contaId: data.contaId ?? null,
      },
    });

    return {
      ok: true,
      transaction: created,
      cardPolicy,
    };
  }

  async update(userId: string, id: string, input: unknown) {
    const data = updateSchema.parse(input);

    const exists = await prisma.transacao.findFirst({
      where: { id, usuarioId: userId },
    });
    if (!exists) {
      return { ok: false, statusCode: 404, message: "Transação não encontrada" };
    }

    const updated = await prisma.transacao.update({
      where: { id },
      data: {
        descricao: data.descricao,
        valor: data.valor ? new Prisma.Decimal(data.valor) : undefined,
        data: data.data ? parseDate(data.data) : undefined,
        tipo: data.tipo,
        status: data.status,
        categoriaId: data.categoriaId === undefined ? undefined : data.categoriaId,
        contaId: data.contaId === undefined ? undefined : data.contaId,
      },
    });

    return { ok: true, transaction: updated };
  }

  async remove(userId: string, id: string) {
    const exists = await prisma.transacao.findFirst({
      where: { id, usuarioId: userId },
    });
    if (!exists) {
      return { ok: false, statusCode: 404, message: "Transação não encontrada" };
    }

    await prisma.transacao.delete({ where: { id } });
    return { ok: true };
  }
}
