export type TipoTransacao = "RECEITA" | "DESPESA";
export type StatusPagamento = "PAGO" | "PENDENTE";
export type OrigemTransacao =
  | "MANUAL"
  | "PARCELA"
  | "IMPORTACAO"
  | "ESTORNO"
  | "AJUSTE_SALDO"
  | "CORRECAO_FATURA";

export type Transacao = {
  id: string;
  descricao: string;
  valor: string | number; // Decimal
  data: string; // ISO
  tipo: TipoTransacao;
  status: StatusPagamento;

  categoriaId?: string | null;
  contaId?: string | null;

  origem: OrigemTransacao;

  // vínculo com fatura (opcional)
  faturaCartaoId?: string | null;
};
