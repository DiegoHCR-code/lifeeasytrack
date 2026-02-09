import type { Response } from "express";
import type { AuthRequest } from "@shared/middlewares/authMiddleware";
import { CreditCardsService } from "./credit-cards.service";

function paramOne(v: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

export class CreditCardsController {
  private service = new CreditCardsService();

  listCards = async (req: AuthRequest, res: Response) => {
    const result = await this.service.listCards(req.userId!);
    res.json(result);
  };

  createCard = async (req: AuthRequest, res: Response) => {
    const result = await this.service.createCard(req.userId!, req.body);
    res.status(result.ok ? 201 : 400).json(result);
  };

  updateCard = async (req: AuthRequest, res: Response) => {
    const id = paramOne(req.params.id);
    const result = await this.service.updateCard(req.userId!, id, req.body);
    res.status(result.ok ? 200 : 404).json(result);
  };

  removeCard = async (req: AuthRequest, res: Response) => {
    const id = paramOne(req.params.id);
    const result = await this.service.removeCard(req.userId!, id);
    res.status(result.ok ? 200 : 404).json(result);
  };

  //   Premium: fatura atual (sem competencia)
  getCurrentInvoice = async (req: AuthRequest, res: Response) => {
    const cardId = paramOne(req.params.id);
    const result = await this.service.getCurrentInvoice(req.userId!, cardId);
    res.status(result.ok ? 200 : 400).json(result);
  };

  getInvoice = async (req: AuthRequest, res: Response) => {
    const cardId = paramOne(req.params.id);
    const competencia = paramOne(req.params.competencia);
    const result = await this.service.getInvoice(req.userId!, cardId, competencia);
    res.status(result.ok ? 200 : 400).json(result);
  };

  payInvoice = async (req: AuthRequest, res: Response) => {
    const cardId = paramOne(req.params.id);
    const competencia = paramOne(req.params.competencia);
    const markTransactions =
      String(req.query.markTransactions ?? "false").toLowerCase() === "true";

    const result = await this.service.payInvoice(req.userId!, cardId, competencia, {
      markTransactions,
    });

    res.status(result.ok ? 200 : 400).json(result);
  };

  //   Premium: fecha ABERTAS que já passaram do fechamento
  closeDueInvoices = async (req: AuthRequest, res: Response) => {
    const result = await this.service.closeDueInvoices(req.userId!);
    res.status(result.ok ? 200 : 400).json(result);
  };
}
