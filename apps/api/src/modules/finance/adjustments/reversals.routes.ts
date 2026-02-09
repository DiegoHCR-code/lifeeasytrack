import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { ReversalsController } from "./reversals.controller";

export const reversalsRoutes = Router();
const controller = new ReversalsController();

// POST /finance/transactions/:id/reverse
reversalsRoutes.post("/transactions/:id/reverse", asyncHandler(controller.reverse));
