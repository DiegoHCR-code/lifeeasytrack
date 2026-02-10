import type { Request, Response } from "express";
import { InvoiceAdjustmentsService } from "./invoice-adjustments.service";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export class InvoiceAdjustmentsController {
  private service = new InvoiceAdjustmentsService();

  adjust = async (req: Request, res: Response) => {
    const cardId = one(req.params.cardId);
    const invoiceId = one(req.params.invoiceId);

    if (!cardId || !invoiceId) {
      return res.status(400).json({ ok: false, message: "Parâmetros inválidos" });
    }

    const result = await this.service.adjustClosedInvoice(req.userId!, cardId, invoiceId, req.body, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(result.ok ? 201 : (result as any).statusCode ?? 400).json(result);
  };
}
