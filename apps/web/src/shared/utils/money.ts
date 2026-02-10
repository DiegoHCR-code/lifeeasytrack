export function formatMoneyBR(value: number, currency = "BRL") {
  return value.toLocaleString("pt-BR", { style: "currency", currency });
}
