import { useQuery } from "@tanstack/react-query";
import { getBudgetSummary } from "./budgets.api";

export function useBudgetSummary(competencia: string) {
  return useQuery({
    queryKey: ["finance", "budgets", "summary", competencia],
    queryFn: () => getBudgetSummary(competencia),
    enabled: !!competencia,
  });
}
