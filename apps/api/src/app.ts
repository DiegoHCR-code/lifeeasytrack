import express from "express";
import cors from "cors";
import { authRoutes } from "@modules/auth/auth.routes";
import { errorMiddleware } from "@shared/middlewares/errorMiddleware";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.json({ name: "LifeEasyTrack API", ok: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);

app.use(errorMiddleware);
