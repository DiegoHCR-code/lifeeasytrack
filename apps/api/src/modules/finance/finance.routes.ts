import { Router } from "express";
import { authMiddleware } from "@shared/middlewares/authMiddleware";
import { categoriesRoutes } from "./categories/categories.routes";
import { accountsRoutes } from "./accounts/accounts.routes";
import { transactionsRoutes } from "./transactions/transactions.routes";

export const financeRoutes = Router();

financeRoutes.use(authMiddleware);

financeRoutes.use("/categories", categoriesRoutes);
financeRoutes.use("/accounts", accountsRoutes);
financeRoutes.use("/transactions", transactionsRoutes);
