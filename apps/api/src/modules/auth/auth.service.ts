import crypto from "crypto";
import { prisma } from "@shared/db/prisma";
import { registerSchema, loginSchema, refreshSchema } from "./auth.schemas";
import { hashPassword, comparePassword } from "@shared/utils/hash";
import { signToken, verifyToken } from "@shared/utils/jwt";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export class AuthService {
  async register(input: unknown) {
    const data = registerSchema.parse(input);

    const exists = await prisma.usuario.findUnique({
      where: { email: data.email },
    });
    if (exists) {
      return { ok: false, message: "Email já cadastrado" };
    }

    const senhaHash = await hashPassword(data.password);

    const user = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash,
      },
      select: { id: true, nome: true, email: true, createdAt: true },
    });

    return { ok: true, user };
  }

  async login(input: unknown) {
    const data = loginSchema.parse(input);

    const user = await prisma.usuario.findUnique({
      where: { email: data.email },
    });
    if (!user) return { ok: false, message: "Credenciais inválidas" };

    const valid = await comparePassword(data.password, user.senhaHash);
    if (!valid) return { ok: false, message: "Credenciais inválidas" };

    const accessToken = signToken(user.id, {
      secret: env("JWT_ACCESS_SECRET"),
      expiresIn: "15m",
    });

    // refreshToken randômico + registro no banco (melhor que JWT pra refresh)
    const refreshToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 dias

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: user.id,
        expiresAt,
      },
    });

    return {
      ok: true,
      accessToken,
      refreshToken,
      user: { id: user.id, nome: user.nome, email: user.email },
    };
  }

  async refresh(input: unknown) {
    const data = refreshSchema.parse(input);

    const stored = await prisma.refreshToken.findUnique({
      where: { token: data.refreshToken },
      include: { usuario: true },
    });

    if (!stored || stored.revoked)
      return { ok: false, message: "Refresh token inválido" };
    if (stored.expiresAt.getTime() < Date.now())
      return { ok: false, message: "Refresh expirado" };

    // Rotação: revoga o antigo e cria um novo
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const newRefresh = crypto.randomBytes(48).toString("hex");
    const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    await prisma.refreshToken.create({
      data: {
        token: newRefresh,
        usuarioId: stored.usuarioId,
        expiresAt: newExpiresAt,
      },
    });

    const accessToken = signToken(stored.usuarioId, {
      secret: env("JWT_ACCESS_SECRET"),
      expiresIn: "15m",
    });

    return { ok: true, accessToken, refreshToken: newRefresh };
  }

  async logout(input: unknown) {
    const data = refreshSchema.parse(input);

    await prisma.refreshToken.updateMany({
      where: { token: data.refreshToken },
      data: { revoked: true },
    });

    return { ok: true };
  }

    async me(userId: string) {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, email: true, createdAt: true }
    });

    return { ok: true, user };
  }

}
