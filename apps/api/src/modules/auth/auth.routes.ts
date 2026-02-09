import { Router } from "express";
import { AuthController } from "./auth.controller";

export const authRoutes = Router();
const controller = new AuthController();

authRoutes.post("/register", controller.register);
authRoutes.post("/login", controller.login);
authRoutes.post("/refresh", controller.refresh);
authRoutes.post("/logout", controller.logout);
