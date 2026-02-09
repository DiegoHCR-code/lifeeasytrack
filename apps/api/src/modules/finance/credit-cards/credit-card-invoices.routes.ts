import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { CreditCardInvoicesController } from "./credit-card-invoices.controller";

export const creditCardInvoicesRoutes = Router();
const controller = new CreditCardInvoicesController();

// GET /cards/:cardId/invoices/current
creditCardInvoicesRoutes.get(
  "/:cardId/invoices/current",
  asyncHandler(controller.getCurrent)
);

// POST /cards/:cardId/invoices/:invoiceId/pay?markTransactions=true
creditCardInvoicesRoutes.post(
  "/:cardId/invoices/:invoiceId/pay",
  asyncHandler(controller.pay)
);
