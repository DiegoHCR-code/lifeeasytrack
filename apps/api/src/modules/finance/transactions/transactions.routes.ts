import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { TransactionsController } from "./transactions.controller";

export const transactionsRoutes = Router();
const controller = new TransactionsController();

transactionsRoutes.get("/", asyncHandler(controller.list));
transactionsRoutes.post("/", asyncHandler(controller.create));
transactionsRoutes.put("/:id", asyncHandler(controller.update));
transactionsRoutes.delete("/:id", asyncHandler(controller.remove));
