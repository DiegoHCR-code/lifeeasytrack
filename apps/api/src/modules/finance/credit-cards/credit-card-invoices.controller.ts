import type { Request, Response } from "express";
import { CreditCardInvoicesService } from "./credit-card-invoices.service";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export class CreditCardInvoicesController {
  private service = new CreditCardInvoicesService();

  // GET /cards/:cardId/invoices/current
  getCurrent = async (req: Request, res: Response) => {
    const cardId = one(req.params.cardId);
    if (!cardId) return res.status(400).json({ ok: false, message: "cardId inválido" });

    const result = await this.service.getCurrentInvoice(req.userId!, cardId);
    return res.status(result.ok ? 200 : 400).json(result);
  };

  // POST /cards/:cardId/invoices/:invoiceId/pay?markTransactions=true
  pay = async (req: Request, res: Response) => {
    const cardId = one(req.params.cardId);
    const invoiceId = one(req.params.invoiceId);

    if (!cardId || !invoiceId) {
      return res.status(400).json({ ok: false, message: "Parâmetros inválidos" });
    }

    const markTransactions =
      String(one(req.query.markTransactions as any) ?? "false").toLowerCase() === "true";

    const result = await this.service.payInvoice(req.userId!, cardId, invoiceId, {
      markTransactions,
    });

    const status = result.ok ? 200 : (result as any).statusCode ?? 400;
    return res.status(status).json(result);
  };
}
