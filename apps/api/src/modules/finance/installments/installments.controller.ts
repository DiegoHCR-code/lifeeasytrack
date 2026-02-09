import type { Response } from "express";
import type { AuthRequest } from "@shared/middlewares/authMiddleware";
import { InstallmentsService } from "@modules/finance/installments/installments.service";

function paramOne(v: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

export class InstallmentsController {
  private service = new InstallmentsService();

  listPlans = async (req: AuthRequest, res: Response) => {
    const result = await this.service.listPlans(req.userId!);
    res.json(result);
  };

  getPlan = async (req: AuthRequest, res: Response) => {
    const id = paramOne(req.params.id);
    const result = await this.service.getPlan(req.userId!, id);
    res.status(result.ok ? 200 : 404).json(result);
  };

  createPlan = async (req: AuthRequest, res: Response) => {
    const result = await this.service.createPlan(req.userId!, req.body);
    res.status(result.ok ? 201 : 400).json(result);
  };

  removePlan = async (req: AuthRequest, res: Response) => {
    const id = paramOne(req.params.id);
    const result = await this.service.removePlan(req.userId!, id);
    res.status(result.ok ? 200 : 404).json(result);
  };

  payInstallment = async (req: AuthRequest, res: Response) => {
    const parcelaId = paramOne(req.params.parcelaId);
    const result = await this.service.setInstallmentStatus(req.userId!, parcelaId, "PAGO");
    res.status(result.ok ? 200 : 404).json(result);
  };

  unpayInstallment = async (req: AuthRequest, res: Response) => {
    const parcelaId = paramOne(req.params.parcelaId);
    const result = await this.service.setInstallmentStatus(req.userId!, parcelaId, "PENDENTE");
    res.status(result.ok ? 200 : 404).json(result);
  };
}
