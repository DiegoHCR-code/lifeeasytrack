import { Router } from "express";
import { asyncHandler } from "@shared/http/asyncHandler";
import { CategoriesController } from "./categories.controller";

export const categoriesRoutes = Router();
const controller = new CategoriesController();

categoriesRoutes.get("/", asyncHandler(controller.list));
categoriesRoutes.post("/", asyncHandler(controller.create));
categoriesRoutes.put("/:id", asyncHandler(controller.update));
categoriesRoutes.delete("/:id", asyncHandler(controller.remove));
