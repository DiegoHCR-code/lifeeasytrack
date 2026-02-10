import { http } from "@shared/api/http";
import type { Conta } from "../accounts/accounts.types";
import type { FaturaCartao } from "./creditCards.types";

// aqui o controller lista "cards" (contas tipo CARTAO)
export async function listCreditCards(): Promise<Conta[]> {
  const { data } = await http.get("/finance/credit-cards");
  return data;
}

// fatura atual
export async function getCurrentInvoice(cardId: string): Promise<FaturaCartao> {
  const { data } = await http.get(`/finance/credit-cards/${cardId}/invoice/current`);
  return data;
}
