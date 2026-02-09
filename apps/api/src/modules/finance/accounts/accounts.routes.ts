import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { AccountsController } from "@modules/finance/accounts";

export const accountsRoutes = Router();
const controller = new AccountsController();

accountsRoutes.get("/", asyncHandler(controller.list));
accountsRoutes.post("/", asyncHandler(controller.create));
accountsRoutes.put("/:id", asyncHandler(controller.update));
accountsRoutes.delete("/:id", asyncHandler(controller.remove));
