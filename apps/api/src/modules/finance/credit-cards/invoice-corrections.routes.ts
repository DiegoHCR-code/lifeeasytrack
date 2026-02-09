import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { InvoiceCorrectionsController } from "./invoice-corrections.controller";

export const invoiceCorrectionsRoutes = Router();
const controller = new InvoiceCorrectionsController();

// POST /finance/cards/:cardId/invoices/:invoiceId/reopen
invoiceCorrectionsRoutes.post(
  "/:cardId/invoices/:invoiceId/reopen",
  asyncHandler(controller.reopen)
);
