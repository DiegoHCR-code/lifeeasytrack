import { useQuery } from "@tanstack/react-query";
import { listAccounts } from "./accounts.api";
import type { Conta } from "./accounts.types";

export function useAccounts() {
  return useQuery<Conta[]>({
    queryKey: ["finance", "accounts"],
    queryFn: listAccounts,
  });
}
