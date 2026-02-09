import type { Response } from "express";
import type { AuthRequest } from "@shared/http/authRequest";
import { TransactionsService } from "./transactions.service";

function paramOne(v: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

export class TransactionsController {
  private service = new TransactionsService();

  list = async (req: AuthRequest, res: Response) => {
    const result = await this.service.list(req.userId!);
    return res.json(result);
  };

  create = async (req: AuthRequest, res: Response) => {
    const behavior = String(paramOne(req.query.cardBehavior as any) ?? "SHIFT")
      .toUpperCase() as "SHIFT" | "BLOCK";

    const result = await this.service.create(req.userId!, req.body, {
      cardBehavior: behavior,
    });

    const status = result.ok ? 201 : (result as any).statusCode ?? 400;
    return res.status(status).json(result);
  };

  update = async (req: AuthRequest, res: Response) => {
    const id = paramOne(req.params.id);
    const result = await this.service.update(req.userId!, id, req.body);

    const status = result.ok ? 200 : (result as any).statusCode ?? 400;
    return res.status(status).json(result);
  };

  remove = async (req: AuthRequest, res: Response) => {
    const id = paramOne(req.params.id);
    const result = await this.service.remove(req.userId!, id);

    const status = result.ok ? 200 : (result as any).statusCode ?? 400;
    return res.status(status).json(result);
  };
}
