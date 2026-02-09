import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { CreditCardsController } from "./credit-cards.controller";

export const creditCardsRoutes = Router();
const controller = new CreditCardsController();

// Cartões (contas tipo CARTAO)
creditCardsRoutes.get("/", asyncHandler(controller.listCards));
creditCardsRoutes.post("/", asyncHandler(controller.createCard));
creditCardsRoutes.put("/:id", asyncHandler(controller.updateCard));
creditCardsRoutes.delete("/:id", asyncHandler(controller.removeCard));

//   Premium: fatura aberta atual (sem competencia)
creditCardsRoutes.get("/:id/invoice/current", asyncHandler(controller.getCurrentInvoice));

// Fatura por competência (mês do vencimento)
creditCardsRoutes.get("/:id/invoice/:competencia", asyncHandler(controller.getInvoice));

// Pagar fatura (opcional: marcar transações como PAGO)
creditCardsRoutes.post("/:id/invoice/:competencia/pay", asyncHandler(controller.payInvoice));

//   Premium: fechar faturas vencidas (manual)
creditCardsRoutes.post("/close-due", asyncHandler(controller.closeDueInvoices));
