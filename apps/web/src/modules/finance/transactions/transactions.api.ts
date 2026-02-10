import { http } from "@shared/api/http";
import type { Transacao } from "./transactions.types";

export type ListTransactionsParams = {
  competencia?: string; // "YYYY-MM" (se seu back aceita)
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
};

export async function listTransactions(params?: ListTransactionsParams): Promise<Transacao[]> {
  const { data } = await http.get("/finance/transactions", { params });
  return data;
}
