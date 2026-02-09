import type { Response } from "express";
import type { AuthRequest } from "@shared/middlewares/authMiddleware";
import { BudgetsService } from "@modules/finance/budgets";

export class BudgetsController {
  private service = new BudgetsService();

  list = async (req: AuthRequest, res: Response) => {
    const result = await this.service.list(req.userId!);
    res.json(result);
  };

  create = async (req: AuthRequest, res: Response) => {
    const result = await this.service.create(req.userId!, req.body);
    res.status(result.ok ? 201 : 400).json(result);
  };

  update = async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await this.service.update(req.userId!, id, req.body);
    res.status(result.ok ? 200 : 404).json(result);
  };

  remove = async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await this.service.remove(req.userId!, id);
    res.status(result.ok ? 200 : 404).json(result);
  };

  summary = async (req: AuthRequest, res: Response) => {
    const competencia = Array.isArray(req.params.competencia) ? req.params.competencia[0] : req.params.competencia;
    const result = await this.service.summary(req.userId!, competencia);
    res.json(result);
  };

  setAlerts = async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await this.service.setAlerts(req.userId!, id, req.body);
    res.status(result.ok ? 200 : 400).json(result);
  };
}
