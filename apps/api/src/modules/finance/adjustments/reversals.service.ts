import { prisma } from "@shared/db/prisma";
import { z } from "zod";
import { OrigemTransacao, Prisma, TipoTransacao } from "@prisma/client";

const reverseSchema = z.object({
  motivo: z.string().min(3),
  data: z.string().optional(), // ISO ou YYYY-MM-DD
});

function parseDate(input?: string) {
  if (!input) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(input + "T00:00:00.000Z");
  return new Date(input);
}

export class ReversalsService {
  async reverse(userId: string, transactionId: string, input: unknown) {
    const data = reverseSchema.parse(input);

    const original = await prisma.transacao.findFirst({
      where: { id: transactionId, usuarioId: userId },
    });

    if (!original) return { ok: false, statusCode: 404, message: "Transação não encontrada" };
    if (original.estornadaEm) return { ok: false, statusCode: 409, message: "Transação já estornada" };

    const invertedTipo: TipoTransacao =
      original.tipo === "DESPESA" ? "RECEITA" : "DESPESA";

    const created = await prisma.$transaction(async (tx) => {
      const estorno = await tx.transacao.create({
        data: {
          usuarioId: userId,
          descricao: `Estorno: ${original.descricao}`,
          valor: new Prisma.Decimal(Number(original.valor)),
          data: parseDate(data.data),
          tipo: invertedTipo,
          status: original.status,
          categoriaId: original.categoriaId,
          contaId: original.contaId,
          origem: OrigemTransacao.ESTORNO,
          transacaoOriginalId: original.id,
        },
      });

      await tx.transacao.update({
        where: { id: original.id },
        data: { estornadaEm: new Date() },
      });

      // auditoria
      await tx.logAuditoria.create({
        data: {
          usuarioId: userId,
          acao: "TRANSACTION_REVERSE",
          entidade: "transacoes",
          entidadeId: original.id,
          detalhes: {
            motivo: data.motivo,
            estornoId: estorno.id,
          },
        },
      });

      return estorno;
    });

    return { ok: true, reversal: created };
  }
}
