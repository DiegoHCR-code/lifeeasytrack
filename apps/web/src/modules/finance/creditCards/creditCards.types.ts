export type StatusFatura = "ABERTA" | "FECHADA" | "PAGA";

export type FaturaCartao = {
  id: string;
  competencia: string;
  status: StatusFatura;

  inicio: string;
  fim: string;
  fechamento: string;
  vencimento: string;

  totalPrevisto: string | number;
  totalPago: string | number;

  contaId: string;
};
