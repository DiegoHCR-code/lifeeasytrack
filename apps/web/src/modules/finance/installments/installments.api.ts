import { http } from "@shared/api/http";
import type { PlanoParcelamento } from "./installments.types";

export async function listPlans(): Promise<PlanoParcelamento[]> {
  const { data } = await http.get("/finance/installments/plans");
  return data;
}
