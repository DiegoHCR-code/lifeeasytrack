import { useQuery } from "@tanstack/react-query";
import { listPlans } from "./installments.api";

export function useInstallmentPlans() {
  return useQuery({
    queryKey: ["finance", "installments", "plans"],
    queryFn: listPlans,
  });
}
