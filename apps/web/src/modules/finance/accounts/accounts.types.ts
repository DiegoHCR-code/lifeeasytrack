export type TipoConta = "CARTEIRA" | "CONTA_CORRENTE" | "CARTAO";

export type Conta = {
  id: string;
  nome: string;
  tipo: TipoConta;

  // cartão (se tipo=CARTAO)
  fechamentoDia?: number | null;
  vencimentoDia?: number | null;

  // muitos backends já retornam isso calculado no controller:
  saldo?: string | number; // Decimal pode vir string
};
