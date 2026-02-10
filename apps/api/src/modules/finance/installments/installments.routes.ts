import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { InstallmentsController } from "@modules/finance/installments";

export const installmentsRoutes = Router();
const controller = new InstallmentsController();

installmentsRoutes.get("/plans", asyncHandler(controller.listPlans));
installmentsRoutes.get("/plans/:planId", asyncHandler(controller.getPlan));
installmentsRoutes.post("/plans", asyncHandler(controller.createPlan));

installmentsRoutes.post("/plans/:planId/anticipate", asyncHandler(controller.anticipate));
installmentsRoutes.post("/plans/:planId/cancel", asyncHandler(controller.cancelPlan));
