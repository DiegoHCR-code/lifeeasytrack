import { z } from "zod";
import { prisma } from "@shared/db/prisma";
import { Prisma } from "@prisma/client";

const createSchema = z.object({
  descricao: z.string().min(2),
  valor: z.number().positive(),
  data: z.string().datetime().or(z.string().min(10)), // aceita ISO ou "YYYY-MM-DD"
  tipo: z.enum(["RECEITA", "DESPESA"]),
  status: z.enum(["PAGO", "PENDENTE"]).optional(),
  categoriaId: z.string().uuid().optional().nullable(),
  contaId: z.string().uuid().optional().nullable(),
});

const updateSchema = createSchema.partial();

function parseDate(input: string) {
  // se vier "YYYY-MM-DD", vira Date local
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(input + "T00:00:00.000Z");
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

  async create(userId: string, input: unknown) {
    const data = createSchema.parse(input);

    // valida se categoria/conta pertencem ao user (se informado)
    if (data.categoriaId) {
      const cat = await prisma.categoria.findFirst({ where: { id: data.categoriaId, usuarioId: userId } });
      if (!cat) return { ok: false, message: "Categoria inválida" };
    }
    if (data.contaId) {
      const acc = await prisma.conta.findFirst({ where: { id: data.contaId, usuarioId: userId } });
      if (!acc) return { ok: false, message: "Conta inválida" };
    }

    const created = await prisma.transacao.create({
      data: {
        descricao: data.descricao,
        valor: new Prisma.Decimal(data.valor),
        data: parseDate(data.data),
        tipo: data.tipo,
        status: data.status ?? "PENDENTE",
        usuarioId: userId,
        categoriaId: data.categoriaId ?? null,
        contaId: data.contaId ?? null,
      },
    });

    return { ok: true, transaction: created };
  }

  async update(userId: string, id: string, input: unknown) {
    const data = updateSchema.parse(input);

    const exists = await prisma.transacao.findFirst({ where: { id, usuarioId: userId } });
    if (!exists) return { ok: false, message: "Transação não encontrada" };

    if (data.categoriaId) {
      const cat = await prisma.categoria.findFirst({ where: { id: data.categoriaId, usuarioId: userId } });
      if (!cat) return { ok: false, message: "Categoria inválida" };
    }
    if (data.contaId) {
      const acc = await prisma.conta.findFirst({ where: { id: data.contaId, usuarioId: userId } });
      if (!acc) return { ok: false, message: "Conta inválida" };
    }

    const updated = await prisma.transacao.update({
      where: { id },
      data: {
        descricao: data.descricao,
        valor: data.valor !== undefined ? new Prisma.Decimal(data.valor) : undefined,
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
    const exists = await prisma.transacao.findFirst({ where: { id, usuarioId: userId } });
    if (!exists) return { ok: false, message: "Transação não encontrada" };

    await prisma.transacao.delete({ where: { id } });
    return { ok: true };
  }
}
