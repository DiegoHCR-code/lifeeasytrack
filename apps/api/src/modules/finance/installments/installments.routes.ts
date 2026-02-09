import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { InstallmentsController } from "@modules/finance/installments/installments.controller";

export const installmentsRoutes = Router();
const controller = new InstallmentsController();

installmentsRoutes.get("/", asyncHandler(controller.listPlans));
installmentsRoutes.get("/:id", asyncHandler(controller.getPlan));
installmentsRoutes.post("/", asyncHandler(controller.createPlan));
installmentsRoutes.delete("/:id", asyncHandler(controller.removePlan));

// pagar/estornar parcela (alterar status da transação)
installmentsRoutes.post("/parcelas/:parcelaId/pay", asyncHandler(controller.payInstallment));
installmentsRoutes.post("/parcelas/:parcelaId/unpay", asyncHandler(controller.unpayInstallment));
