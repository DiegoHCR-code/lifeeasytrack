import type { Request, Response } from "express";
import { ReversalsService } from "./reversals.service";

export class ReversalsController {
  private service = new ReversalsService();

  reverse = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await this.service.reverse(req.userId!, id, req.body);

    const status = result.ok ? 200 : (result as any).statusCode ?? 400;
    return res.status(status).json(result);
  };
}
