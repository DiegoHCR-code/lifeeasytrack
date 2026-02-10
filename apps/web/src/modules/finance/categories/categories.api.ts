import { http } from "@shared/api/http";
import type { Categoria } from "./categories.types";

export async function listCategories(): Promise<Categoria[]> {
  const { data } = await http.get("/finance/categories");
  return data;
}
