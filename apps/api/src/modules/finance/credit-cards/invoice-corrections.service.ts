import { prisma } from "@shared/db/prisma";
import { StatusFatura } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  motivo: z.string().min(3),
});

export class InvoiceCorrectionsService {
  async reopen(userId: string, cardId: string, invoiceId: string, input: unknown) {
    const data = schema.parse(input);

    const invoice = await prisma.faturaCartao.findFirst({
      where: { id: invoiceId, usuarioId: userId, contaId: cardId },
    });

    if (!invoice) return { ok: false, statusCode: 404, message: "Fatura não encontrada" };
    if (invoice.status !== StatusFatura.FECHADA) {
      return { ok: false, statusCode: 409, message: "Apenas fatura FECHADA pode ser reaberta" };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reopened = await tx.faturaCartao.update({
        where: { id: invoiceId },
        data: { status: StatusFatura.ABERTA },
      });

      await tx.logAuditoria.create({
        data: {
          usuarioId: userId,
          acao: "INVOICE_REOPEN",
          entidade: "faturas_cartao",
          entidadeId: invoiceId,
          detalhes: {
            motivo: data.motivo,
            cardId,
            competencia: invoice.competencia,
          },
        },
      });

      return reopened;
    });

    return { ok: true, invoice: updated };
  }
}
