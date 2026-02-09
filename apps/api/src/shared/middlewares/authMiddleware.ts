import type { Response, NextFunction } from "express";
import type { Request } from "express";
import { verifyToken } from "@shared/utils/jwt";

type JwtPayload = { sub?: string };

export type AuthRequest = Request & { userId?: string };

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "Não autenticado" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyToken<JwtPayload>(token, process.env.JWT_ACCESS_SECRET!);
    if (!payload?.sub) {
      return res.status(401).json({ ok: false, message: "Token inválido" });
    }

    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Token inválido ou expirado" });
  }
}
