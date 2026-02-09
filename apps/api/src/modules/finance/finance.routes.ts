import { Router } from "express";
import { authMiddleware } from "@shared/middlewares/authMiddleware";
import { categoriesRoutes } from "@modules/finance/categories/categories.routes";
import { accountsRoutes } from "@modules/finance/accounts/accounts.routes";
import { transactionsRoutes } from "@modules/finance/transactions/transactions.routes";
import { budgetsRoutes } from "@modules/finance/budgets/budgets.routes";
import { installmentsRoutes } from "@modules/finance/installments/installments.routes";

export const financeRoutes = Router();

financeRoutes.use(authMiddleware);

financeRoutes.use("/categories", categoriesRoutes);
financeRoutes.use("/accounts", accountsRoutes);
financeRoutes.use("/transactions", transactionsRoutes);
financeRoutes.use("/budgets", budgetsRoutes);
financeRoutes.use("/installments", installmentsRoutes);