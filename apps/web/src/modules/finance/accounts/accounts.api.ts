import { http } from "@shared/api/http";
import type { Conta } from "@modules/finance/accounts/accounts.types";

export async function listAccounts(): Promise<Conta[]> {
  const { data } = await http.get("/finance/accounts");
  return data;
}
