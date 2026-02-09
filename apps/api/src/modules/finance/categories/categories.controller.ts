import type { Response } from "express";
import type { AuthRequest } from "@shared/middlewares/authMiddleware";
import { CategoriesService } from "@modules/finance/categories";

export class CategoriesController {
  private service = new CategoriesService();

  list = async (req: AuthRequest, res: Response) => {
    const result = await this.service.list(req.userId!);
    res.json(result);
  };

  create = async (req: AuthRequest, res: Response) => {
    const result = await this.service.create(req.userId!, req.body);
    res.status(result.ok ? 201 : 400).json(result);
  };

  update = async (req: AuthRequest, res: Response) => {
    const result = await this.service.update(req.userId!, Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, req.body);
    res.status(result.ok ? 200 : 404).json(result);
  };

  remove = async (req: AuthRequest, res: Response) => {
    const result = await this.service.remove(req.userId!, Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    res.status(result.ok ? 200 : 404).json(result);
  };
}
