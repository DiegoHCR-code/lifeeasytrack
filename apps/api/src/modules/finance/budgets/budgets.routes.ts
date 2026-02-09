import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { BudgetsController } from "@modules/finance/budgets";

export const budgetsRoutes = Router();
const controller = new BudgetsController();

budgetsRoutes.get("/", asyncHandler(controller.list));
budgetsRoutes.post("/", asyncHandler(controller.create));

budgetsRoutes.get("/summary/:competencia", asyncHandler(controller.summary));
budgetsRoutes.post("/:id/alerts", asyncHandler(controller.setAlerts));

budgetsRoutes.put("/:id", asyncHandler(controller.update));
budgetsRoutes.delete("/:id", asyncHandler(controller.remove));
