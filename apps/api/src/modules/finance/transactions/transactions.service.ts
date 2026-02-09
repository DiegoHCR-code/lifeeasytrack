import { z } from "zod";
import { prisma } from "@shared/db/prisma";
import { Prisma, StatusFatura, StatusPagamento, TipoConta } from "@prisma/client";
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(input + "T00:00:00.000Z");
  return new Date(input);
}

async function ensureTransactionNotInClosedInvoice(userId: string, transactionId: string) {
  const tx = await prisma.transacao.findFirst({
    where: { id: transactionId, usuarioId: userId },
    select: { id: true, contaId: true, data: true },
  });

  if (!tx) {
    return { ok: false as const, statusCode: 404, message: "Transação não encontrada" };
  }

  if (!tx.contaId) return { ok: true as const, tx };

  const account = await prisma.conta.findFirst({
    where: { id: tx.contaId, usuarioId: userId },
    select: { id: true, tipo: true },
  });

  if (!account || account.tipo !== TipoConta.CARTAO) return { ok: true as const, tx };

  const closedInvoice = await prisma.faturaCartao.findFirst({
    where: {
      usuarioId: userId,
      contaId: tx.contaId,
      inicio: { lte: tx.data },
      fim: { gte: tx.data },
      status: { in: [StatusFatura.FECHADA, StatusFatura.PAGA] },
    },
    select: { id: true, competencia: true, status: true },
  });

  if (closedInvoice) {
    return {
      ok: false as const,
      statusCode: 409,
      message: `Transação pertence a uma fatura ${closedInvoice.status} (${closedInvoice.competencia}) e não pode ser alterada/excluída`,
    };
  }

  return { ok: true as const, tx };
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

  async create(userId: string, input: unknown, opts?: { cardBehavior?: "SHIFT" | "BLOCK" }) {
    const data = createSchema.parse(input);

    if (data.categoriaId) {
      const cat = await prisma.categoria.findFirst({
        where: { id: data.categoriaId, usuarioId: userId },
      });
      if (!cat) return { ok: false, statusCode: 400, message: "Categoria inválida" };
    }

    if (data.contaId) {
      const acc = await prisma.conta.findFirst({
        where: { id: data.contaId, usuarioId: userId },
      });
      if (!acc) return { ok: false, statusCode: 400, message: "Conta inválida" };
    }

    const intendedDate = parseDate(data.data);
    let finalDate = intendedDate;
    let cardPolicy: any = null;

    //   SHIFT/BLOCK em cartão com fatura fechada/paga
    if (data.contaId) {
      const resolved = await resolveCardPostingDate({
        userId,
        contaId: data.contaId,
        intendedDate,
        behavior: opts?.cardBehavior ?? "SHIFT",
      });

      if (!resolved.ok) {
        return { ok: false, statusCode: 409, message: resolved.message };
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
        status: data.status ?? StatusPagamento.PENDENTE,
        usuarioId: userId,
        categoriaId: data.categoriaId ?? null,
        contaId: data.contaId ?? null,
      },
    });

    return { ok: true, transaction: created, cardPolicy };
  }

  async update(userId: string, id: string, input: unknown) {
    //   bloqueio se cair em fatura FECHADA/PAGA
    const guard = await ensureTransactionNotInClosedInvoice(userId, id);
    if (!guard.ok) return guard;

    const data = updateSchema.parse(input);

    const updated = await prisma.transacao.update({
      where: { id },
      data: {
        descricao: data.descricao,
        valor: data.valor !== undefined ? new Prisma.Decimal(data.valor) : undefined,
        data: data.data ? parseDate(data.data) : undefined,
        tipo: data.tipo,
        status: data.status as any,
        categoriaId: data.categoriaId === undefined ? undefined : data.categoriaId,
        contaId: data.contaId === undefined ? undefined : data.contaId,
      },
    });

    return { ok: true, transaction: updated };
  }

  async remove(userId: string, id: string) {
    //   bloqueio se cair em fatura FECHADA/PAGA
    const guard = await ensureTransactionNotInClosedInvoice(userId, id);
    if (!guard.ok) return guard;

    await prisma.transacao.delete({ where: { id } });
    return { ok: true };
  }
}
