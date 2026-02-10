import { prisma } from "@shared/db/prisma";
import { z } from "zod";
import { OrigemTransacao, Prisma, StatusFatura, StatusPagamento } from "@prisma/client";
import { auditLog } from "@shared/audit/auditLog";

const schema = z.object({
  descricao: z.string().min(2),
  valor: z.number().positive(),
  tipo: z.enum(["DESPESA", "RECEITA"]), // normalmente DESPESA/RECEITA
  data: z.string().optional(), // se omitido usa fim da fatura
  categoriaId: z.string().uuid().optional().nullable(),
  motivo: z.string().min(3),
});

function parseDate(input?: string) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(input + "T00:00:00.000Z");
  return new Date(input);
}

export class InvoiceAdjustmentsService {
  async adjustClosedInvoice(userId: string, cardId: string, invoiceId: string, input: unknown, meta?: any) {
    const data = schema.parse(input);

    const invoice = await prisma.faturaCartao.findFirst({
      where: { id: invoiceId, usuarioId: userId, contaId: cardId },
      include: { conta: true },
    });

    if (!invoice) return { ok: false, statusCode: 404, message: "Fatura não encontrada" };
    if (invoice.status !== StatusFatura.FECHADA) {
      return { ok: false, statusCode: 409, message: "A correção é permitida apenas para fatura FECHADA" };
    }

    const dateToUse = parseDate(data.data) ?? invoice.fim;

    // garantir data DENTRO do ciclo da fatura fechada
    if (dateToUse < invoice.inicio || dateToUse > invoice.fim) {
      return {
        ok: false,
        statusCode: 400,
        message: "Data da correção precisa estar dentro do ciclo da fatura",
      };
    }

    // valida categoria pertence ao user (se informado)
    if (data.categoriaId) {
      const cat = await prisma.categoria.findFirst({ where: { id: data.categoriaId, usuarioId: userId } });
      if (!cat) return { ok: false, statusCode: 400, message: "Categoria inválida" };
    }

    const created = await prisma.$transaction(async (tx) => {
      const correction = await tx.transacao.create({
        data: {
          usuarioId: userId,
          contaId: cardId,
          categoriaId: data.categoriaId ?? null,
          descricao: `Correção fatura (${invoice.competencia}): ${data.descricao}`,
          valor: new Prisma.Decimal(data.valor),
          data: dateToUse,
          tipo: data.tipo,
          status: StatusPagamento.PAGO, // correção já “compensada”
          origem: OrigemTransacao.CORRECAO_FATURA,
          faturaCartaoId: invoice.id,
        },
      });

      await tx.logAuditoria.create({
        data: auditLog({
          usuarioId: userId,
          acao: "INVOICE_ADJUST_CLOSED",
          entidade: "faturas_cartao",
          entidadeId: invoice.id,
          detalhes: {
            motivo: data.motivo,
            correctionTransactionId: correction.id,
            valor: data.valor,
            tipo: data.tipo,
            competencia: invoice.competencia,
          },
          meta,
        }),
      });

      return correction;
    });

    return { ok: true, transaction: created };
  }
}
