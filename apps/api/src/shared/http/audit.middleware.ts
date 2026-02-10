import type { Request, Response, NextFunction } from "express";
import { prisma } from "@shared/db/prisma";
import { auditLog } from "@shared/audit/auditLog";

export function auditHttpWrites() {
  return (req: Request, res: Response, next: NextFunction) => {
    const write = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase());
    if (!write) return next();

    const startedAt = Date.now();

    res.on("finish", async () => {
      try {
        await prisma.logAuditoria.create({
          data: auditLog({
            usuarioId: req.userId ?? null,
            acao: `HTTP_${req.method.toUpperCase()}`,
            entidade: "http",
            entidadeId: null,
            detalhes: {
              path: req.originalUrl,
              statusCode: res.statusCode,
              durationMs: Date.now() - startedAt,
              params: req.params,
              query: req.query,
              body: req.body ?? null,
            },
            meta: { ip: req.ip, userAgent: req.headers["user-agent"] },
          }),
        });
      } catch {
        // nunca derrubar request por falha no log
      }
    });

    next();
  };
}
