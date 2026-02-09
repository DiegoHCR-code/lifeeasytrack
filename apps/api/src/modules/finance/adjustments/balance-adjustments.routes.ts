import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { BalanceAdjustmentsController } from "./balance-adjustments.controller";

export const balanceAdjustmentsRoutes = Router();
const controller = new BalanceAdjustmentsController();

balanceAdjustmentsRoutes.get("/balance-adjustments", asyncHandler(controller.list));
balanceAdjustmentsRoutes.post("/balance-adjustments", asyncHandler(controller.create));
