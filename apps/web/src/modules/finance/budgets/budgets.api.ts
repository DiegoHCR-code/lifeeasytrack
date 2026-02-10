import { http } from "@shared/api/http";

export async function getBudgetSummary(competencia: string) {
  const { data } = await http.get(`/finance/budgets/summary/${competencia}`);
  return data;
}
