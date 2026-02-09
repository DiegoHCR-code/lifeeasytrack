import type { Request, Response } from "express";
import { InvoiceCorrectionsService } from "./invoice-corrections.service";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export class InvoiceCorrectionsController {
  private service = new InvoiceCorrectionsService();

  reopen = async (req: Request, res: Response) => {
    const cardId = one(req.params.cardId);
    const invoiceId = one(req.params.invoiceId);

    if (!cardId || !invoiceId) {
      return res.status(400).json({ ok: false, message: "Parâmetros inválidos" });
    }

    const result = await this.service.reopen(req.userId!, cardId, invoiceId, req.body);
    const status = result.ok ? 200 : (result as any).statusCode ?? 400;
    return res.status(status).json(result);
  };
}
