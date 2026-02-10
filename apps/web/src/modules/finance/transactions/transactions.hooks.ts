import { useQuery } from "@tanstack/react-query";
import { listTransactions, type ListTransactionsParams } from "./transactions.api";

export function useTransactions(params?: ListTransactionsParams) {
  return useQuery({
    queryKey: ["finance", "transactions", params ?? {}],
    queryFn: () => listTransactions(params),
  });
}
