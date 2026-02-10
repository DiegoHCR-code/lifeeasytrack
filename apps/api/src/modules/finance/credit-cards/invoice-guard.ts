import { prisma } from "@shared/db/prisma";
import { StatusFatura, TipoConta } from "@prisma/client";

export async function findInvoiceForTransaction(userId: string, cardId: string, date: Date) {
  const card = await prisma.conta.findFirst({
    where: { id: cardId, usuarioId: userId },
    select: { id: true, tipo: true },
  });

  if (!card || card.tipo !== TipoConta.CARTAO) return null;

  const invoice = await prisma.faturaCartao.findFirst({
    where: {
      usuarioId: userId,
      contaId: cardId,
      inicio: { lte: date },
      fim: { gte: date },
    },
  });

  return invoice;
}

export function isInvoiceClosedOrPaid(status: StatusFatura) {
  return status === StatusFatura.FECHADA || status === StatusFatura.PAGA;
}
