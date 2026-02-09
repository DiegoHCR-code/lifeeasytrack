import { z } from "zod";
import { prisma } from "@shared/db/prisma";

const createSchema = z.object({
  nome: z.string().min(2),
});

const updateSchema = z.object({
  nome: z.string().min(2),
});

export class CategoriesService {
  async list(userId: string) {
    const items = await prisma.categoria.findMany({
      where: { usuarioId: userId },
      orderBy: { createdAt: "desc" },
    });
    return { ok: true, items };
  }

  async create(userId: string, input: unknown) {
    const data = createSchema.parse(input);

    const category = await prisma.categoria.create({
      data: { nome: data.nome, usuarioId: userId },
    });

    return { ok: true, category };
  }

  async update(userId: string, id: string, input: unknown) {
    const data = updateSchema.parse(input);

    const exists = await prisma.categoria.findFirst({
      where: { id, usuarioId: userId },
    });
    if (!exists) return { ok: false, message: "Categoria não encontrada" };

    const category = await prisma.categoria.update({
      where: { id },
      data: { nome: data.nome },
    });

    return { ok: true, category };
  }

  async remove(userId: string, id: string) {
    const exists = await prisma.categoria.findFirst({
      where: { id, usuarioId: userId },
    });
    if (!exists) return { ok: false, message: "Categoria não encontrada" };

    await prisma.categoria.delete({ where: { id } });
    return { ok: true };
  }
}
