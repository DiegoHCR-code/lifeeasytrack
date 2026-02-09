import { z } from "zod";
import { prisma } from "@shared/db/prisma";

const createSchema = z.object({
  nome: z.string().min(2),
});

const updateSchema = z.object({
  nome: z.string().min(2),
});

export class AccountsService {
  async list(userId: string) {
    const items = await prisma.conta.findMany({
      where: { usuarioId: userId },
      orderBy: { createdAt: "desc" },
    });
    return { ok: true, items };
  }

  async create(userId: string, input: unknown) {
    const data = createSchema.parse(input);

    const account = await prisma.conta.create({
      data: { nome: data.nome, usuarioId: userId },
    });

    return { ok: true, account };
  }

  async update(userId: string, id: string, input: unknown) {
    const data = updateSchema.parse(input);

    const exists = await prisma.conta.findFirst({
      where: { id, usuarioId: userId },
    });
    if (!exists) return { ok: false, message: "Conta não encontrada" };

    const account = await prisma.conta.update({
      where: { id },
      data: { nome: data.nome },
    });

    return { ok: true, account };
  }

  async remove(userId: string, id: string) {
    const exists = await prisma.conta.findFirst({
      where: { id, usuarioId: userId },
    });
    if (!exists) return { ok: false, message: "Conta não encontrada" };

    await prisma.conta.delete({ where: { id } });
    return { ok: true };
  }
}
