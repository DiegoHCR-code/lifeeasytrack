import type { Request, Response, NextFunction } from "express";
import { prisma } from "@shared/db/prisma";

export function audit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const write = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase());
    if (!write) return next();

    const startedAt = Date.now();

    res.on("finish", async () => {
      try {
        // só loga se foi sucesso ou se quiser logar tudo
        const statusCode = res.statusCode;

        await prisma.logAuditoria.create({
          data: {
            usuarioId: req.userId ?? null,
            acao: `HTTP_${req.method.toUpperCase()}`,
            entidade: "http",
            entidadeId: null,
            detalhes: {
              path: req.originalUrl,
              statusCode,
              durationMs: Date.now() - startedAt,
              body: req.body ?? null,
              params: req.params ?? null,
              query: req.query ?? null,
            },
            ip: req.ip,
            userAgent: req.headers["user-agent"] ?? null,
          },
        });
      } catch {
        // não pode derrubar request por falha de auditoria
      }
    });

    next();
  };
}
