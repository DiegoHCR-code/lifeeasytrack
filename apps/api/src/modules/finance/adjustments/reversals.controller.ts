import type { Request, Response } from "express";
import { ReversalsService } from "./reversals.service";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export class ReversalsController {
  private service = new ReversalsService();

  reverse = async (req: Request, res: Response) => {
    const id = one(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "id inválido" });

    const result = await this.service.reverse(req.userId!, id, req.body, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(result.ok ? 200 : (result as any).statusCode ?? 400).json(result);
  };
}
