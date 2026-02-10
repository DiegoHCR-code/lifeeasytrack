import { useQuery } from "@tanstack/react-query";
import { listCategories } from "./categories.api";

export function useCategories() {
  return useQuery({
    queryKey: ["finance", "categories"],
    queryFn: listCategories,
  });
}
