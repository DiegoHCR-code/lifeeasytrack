export type StatusPlanoParcelamento = "ATIVO" | "CANCELADO";
export type StatusParcela = "PENDENTE" | "PAGA" | "CANCELADA";

export type PlanoParcelamento = {
  id: string;
  descricao: string;
  total: string | number;
  numeroParcelas: number;
  primeiraCompetencia: string;

  status: StatusPlanoParcelamento;

  contaId?: string | null;
  categoriaId?: string | null;

  parcelas?: Parcela[]; // pode vir incluído ou não
};

export type Parcela = {
  id: string;
  numero: number;
  competencia: string;
  valor: string | number;
  vencimento?: string | null;
  status: StatusParcela;

  planoId: string;
  transacaoId?: string | null;
};
