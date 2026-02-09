import type { Request, Response } from "express";
import { BalanceAdjustmentsService } from "./balance-adjustments.service";

export class BalanceAdjustmentsController {
  private service = new BalanceAdjustmentsService();

  list = async (req: Request, res: Response) => {
    const result = await this.service.list(req.userId!);
    return res.status(200).json(result);
  };

  create = async (req: Request, res: Response) => {
    const result = await this.service.create(req.userId!, req.body);
    const status = result.ok ? 201 : (result as any).statusCode ?? 400;
    return res.status(status).json(result);
  };
}
