import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import type { AuthRequest } from "@shared/middlewares/authMiddleware";

export class AuthController {
  private service = new AuthService();

  register = async (req: Request, res: Response) => {
    const result = await this.service.register(req.body);
    return res.status(result.ok ? 201 : 400).json(result);
  };

  login = async (req: Request, res: Response) => {
    const result = await this.service.login(req.body);
    return res.status(result.ok ? 200 : 401).json(result);
  };

  refresh = async (req: Request, res: Response) => {
    const result = await this.service.refresh(req.body);
    return res.status(result.ok ? 200 : 401).json(result);
  };

  logout = async (req: Request, res: Response) => {
    const result = await this.service.logout(req.body);
    return res.status(200).json(result);
  };

  me = async (req: AuthRequest, res: Response) => {
    const result = await this.service.me(req.userId!);
    return res.status(200).json(result);
  };
}
