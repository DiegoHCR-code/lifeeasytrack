import type { Response } from "express";
import type { AuthRequest } from "@shared/middlewares/authMiddleware";
import { AccountsService } from "@modules/finance/accounts";

export class AccountsController {
  private service = new AccountsService();

  list = async (req: AuthRequest, res: Response) => {
    const result = await this.service.list(req.userId!);
    res.json(result);
  };

  create = async (req: AuthRequest, res: Response) => {
    const result = await this.service.create(req.userId!, req.body);
    res.status(result.ok ? 201 : 400).json(result);
  };

  update = async (req: AuthRequest, res: Response) => {
    const result = await this.service.update(req.userId!, req.params.id as string, req.body);
    res.status(result.ok ? 200 : 404).json(result);
  };

  remove = async (req: AuthRequest, res: Response) => {
    const result = await this.service.update(req.userId!, req.params.id as string, req.body);
    res.status(result.ok ? 200 : 404).json(result);
  };
}
