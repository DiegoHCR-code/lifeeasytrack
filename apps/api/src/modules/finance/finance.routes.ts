import { Router } from "express";
import { authMiddleware } from "@shared/middlewares/authMiddleware";
import { categoriesRoutes } from "@modules/finance/categories/categories.routes";
import { accountsRoutes } from "@modules/finance/accounts/accounts.routes";
import { transactionsRoutes } from "@modules/finance/transactions/transactions.routes";
import { budgetsRoutes } from "@modules/finance/budgets/budgets.routes";
import { installmentsRoutes } from "@modules/finance/installments/installments.routes";
import { creditCardsRoutes } from "@modules/finance/credit-cards/credit-cards.routes";
import { creditCardInvoicesRoutes } from "./credit-cards/credit-card-invoices.routes";
import { invoiceCorrectionsRoutes } from "@modules/finance/credit-cards/invoice-corrections.routes";
import { reversalsRoutes } from "@modules/finance/adjustments/reversals.routes";
import { balanceAdjustmentsRoutes } from "@modules/finance/adjustments/balance-adjustments.routes";
import { invoiceAdjustmentsRoutes } from "@modules/finance/credit-cards/invoice-adjustments.routes";

export const financeRoutes = Router();

financeRoutes.use(authMiddleware);

financeRoutes.use("/categories", categoriesRoutes);
financeRoutes.use("/accounts", accountsRoutes);
financeRoutes.use("/transactions", transactionsRoutes);
financeRoutes.use("/budgets", budgetsRoutes);
financeRoutes.use("/installments", installmentsRoutes);
financeRoutes.use("/cards", creditCardsRoutes);
financeRoutes.use("/card/invoices", creditCardInvoicesRoutes);
financeRoutes.use("/", reversalsRoutes);
financeRoutes.use("/", balanceAdjustmentsRoutes);
financeRoutes.use("/cards", invoiceCorrectionsRoutes);
financeRoutes.use("/cards", invoiceAdjustmentsRoutes);
