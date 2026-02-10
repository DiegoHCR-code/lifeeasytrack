import { Response } from "express";
import { AuthRequest } from "@shared/middlewares/authMiddleware";
import { InstallmentsService } from "./installments.service";

export class InstallmentsController {
  private service = new InstallmentsService();

  listPlans = async (req: AuthRequest, res: Response) => {
    const result = await this.service.listPlans(req.userId!);
    return res.status(result.ok ? 200 : ((result as any).statusCode ?? 400)).json(result);
  };

  getPlan = async (req: AuthRequest, res: Response) => {
    const planId = String(req.params.planId);
    const result = await this.service.getPlan(req.userId!, planId);
    return res.status(result.ok ? 200 : ((result as any).statusCode ?? 400)).json(result);
  };

  createPlan = async (req: AuthRequest, res: Response) => {
    const result = await this.service.createPlan(req.userId!, req.body);
    return res.status(result.ok ? 201 : ((result as any).statusCode ?? 400)).json(result);
  };

  anticipate = async (req: AuthRequest, res: Response) => {
    const planId = String(req.params.planId);
    const result = await this.service.anticipate(req.userId!, planId, req.body);
    return res.status(result.ok ? 200 : ((result as any).statusCode ?? 400)).json(result);
  };

  cancelPlan = async (req: AuthRequest, res: Response) => {
    const planId = String(req.params.planId);
    const result = await this.service.cancelPlan(req.userId!, planId, req.body);
    return res.status(result.ok ? 200 : ((result as any).statusCode ?? 400)).json(result);
  };
}
