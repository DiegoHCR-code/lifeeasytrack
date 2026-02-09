import { prisma } from "@shared/db/prisma";
import { z } from "zod";
import { OrigemTransacao, Prisma, StatusPagamento } from "@prisma/client";

const schema = z.object({
  contaId: z.string().uuid(),
  valor: z.number(), // pode ser negativo
  data: z.string().optional(),
  motivo: z.string().min(3),
  criarTransacao: z.boolean().optional().default(true),
});

function parseDate(input?: string) {
  if (!input) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(input + "T00:00:00.000Z");
  return new Date(input);
}

export class BalanceAdjustmentsService {
  async create(userId: string, input: unknown) {
    const data = schema.parse(input);

    const conta = await prisma.conta.findFirst({
      where: { id: data.contaId, usuarioId: userId },
    });
    if (!conta) return { ok: false, statusCode: 404, message: "Conta não encontrada" };

    const created = await prisma.$transaction(async (tx) => {
      let transacaoId: string | null = null;

      if (data.criarTransacao) {
        const tipo = data.valor >= 0 ? "RECEITA" : "DESPESA";

        const t = await tx.transacao.create({
          data: {
            usuarioId: userId,
            contaId: data.contaId,
            descricao: `Ajuste de saldo: ${data.motivo}`,
            valor: new Prisma.Decimal(Math.abs(data.valor)),
            data: parseDate(data.data),
            tipo,
            status: StatusPagamento.PAGO,
            origem: OrigemTransacao.AJUSTE_SALDO,
          },
        });

        transacaoId = t.id;
      }

      const ajuste = await tx.ajusteSaldo.create({
        data: {
          usuarioId: userId,
          contaId: data.contaId,
          valor: new Prisma.Decimal(data.valor),
          data: parseDate(data.data),
          motivo: data.motivo,
          transacaoId: transacaoId ?? undefined,
        },
      });

      await tx.logAuditoria.create({
        data: {
          usuarioId: userId,
          acao: "BALANCE_ADJUST",
          entidade: "ajustes_saldo",
          entidadeId: ajuste.id,
          detalhes: {
            contaId: data.contaId,
            valor: data.valor,
            motivo: data.motivo,
            transacaoId,
          },
        },
      });

      return { ajuste, transacaoId };
    });

    return { ok: true, ...created };
  }

  async list(userId: string) {
    const items = await prisma.ajusteSaldo.findMany({
      where: { usuarioId: userId },
      orderBy: { createdAt: "desc" },
      include: { conta: { select: { id: true, nome: true } } },
    });
    return { ok: true, items };
  }
}
