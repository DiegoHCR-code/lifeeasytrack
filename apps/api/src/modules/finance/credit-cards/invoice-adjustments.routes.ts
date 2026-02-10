import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { InvoiceAdjustmentsController } from "./invoice-adjustments.controller";

export const invoiceAdjustmentsRoutes = Router();
const controller = new InvoiceAdjustmentsController();

// POST /finance/cards/:cardId/invoices/:invoiceId/adjust
invoiceAdjustmentsRoutes.post(
  "/:cardId/invoices/:invoiceId/adjust",
  asyncHandler(controller.adjust)
);
