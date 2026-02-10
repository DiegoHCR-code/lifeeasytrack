import { useQuery } from "@tanstack/react-query";
import { getCurrentInvoice, listCreditCards } from "./creditCards.api";

export function useCreditCards() {
  return useQuery({
    queryKey: ["finance", "creditCards"],
    queryFn: listCreditCards,
  });
}

export function useCurrentInvoice(cardId?: string) {
  return useQuery({
    queryKey: ["finance", "creditCards", cardId, "invoice", "current"],
    queryFn: () => getCurrentInvoice(cardId!),
    enabled: !!cardId,
  });
}
