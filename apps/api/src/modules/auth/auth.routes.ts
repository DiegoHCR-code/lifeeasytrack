import { Router } from "express";
import { AuthController } from "./auth.controller";
import { asyncHandler } from "@shared/http/asyncHandler";
import { authMiddleware } from "@shared/middlewares/authMiddleware";

export const authRoutes = Router();
const controller = new AuthController();

authRoutes.post("/register", asyncHandler(controller.register));
authRoutes.post("/login", asyncHandler(controller.login));
authRoutes.post("/refresh", asyncHandler(controller.refresh));
authRoutes.post("/logout", asyncHandler(controller.logout));

authRoutes.get("/me", authMiddleware, asyncHandler(controller.me));
