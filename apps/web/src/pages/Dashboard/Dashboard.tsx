import { useMemo } from "react";
import { Box, Stack, Typography, Chip, IconButton } from "@mui/material";
import Grid from "@mui/material/Grid";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";

import GlassCard from "./components/GlassCard";

import { useAccounts } from "@modules/finance/accounts/accounts.hooks";
import { useTransactions } from "@modules/finance/transactions/transactions.hooks";
import { useCategories } from "@modules/finance/categories/categories.hooks";
import { useCreditCards, useCurrentInvoice } from "@modules/finance/creditCards/creditCards.hooks";
import { useInstallmentPlans } from "@modules/finance/installments/installments.hooks";

import type { Conta } from "@modules/finance/accounts/accounts.types";
import type { Transacao } from "@modules/finance/transactions/transactions.types";
import type { Categoria } from "@modules/finance/categories/categories.types";
import type { PlanoParcelamento, Parcela } from "@modules/finance/installments/installments.types";
import type { FaturaCartao } from "@modules/finance/creditCards/creditCards.types";

import { formatMoneyBR } from "@shared/utils/money";
import { toCompetencia } from "@shared/utils/dates";
import { toNumber } from "@shared/utils/number";

function safeDateBR(value?: string | Date | null) {
  if (!value) return undefined;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("pt-BR");
}

function safeDateTimeBR(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h5">{title}</Typography>
      <Typography color="text.secondary">{subtitle}</Typography>
    </Box>
  );
}

type UpcomingEvent = {
  title: string;
  subtitle: string;
  due?: string;
  amount: number;
  kind: "RECEITA" | "DESPESA";
};

export default function Dashboard() {
  const competencia = toCompetencia(new Date());

  const accountsQ = useAccounts();
  const cardsQ = useCreditCards();
  const categoriesQ = useCategories();

  const monthTxQ = useTransactions({ competencia });
  const recentTxQ = useTransactions({ limit: 12 });

  const firstCardId = cardsQ.data?.[0]?.id;
  const invoiceQ = useCurrentInvoice(firstCardId); // hook já deve ter enabled: !!cardId

  const plansQ = useInstallmentPlans();

  const totals = useMemo(() => {
    const tx: Transacao[] = monthTxQ.data ?? [];

    const receita = tx
      .filter((t) => t.tipo === "RECEITA")
      .reduce((sum, t) => sum + toNumber(t.valor), 0);

    const despesa = tx
      .filter((t) => t.tipo === "DESPESA")
      .reduce((sum, t) => sum + toNumber(t.valor), 0);

    const despesaPaga = tx
      .filter((t) => t.tipo === "DESPESA" && t.status === "PAGO")
      .reduce((sum, t) => sum + toNumber(t.valor), 0);

    return { receita, despesa, despesaPaga };
  }, [monthTxQ.data]);

  const totalBalance = useMemo(() => {
    const accounts: Conta[] = accountsQ.data ?? [];

    const hasSaldo = accounts.some((a) => a.saldo != null);
    if (hasSaldo) {
      return accounts.reduce((sum, a) => sum + toNumber(a.saldo), 0);
    }

    // fallback (se o back ainda não calcula saldo por conta)
    return totals.receita - totals.despesa;
  }, [accountsQ.data, totals]);

  const topCategories = useMemo(() => {
    const tx: Transacao[] = monthTxQ.data ?? [];
    const cats: Categoria[] = categoriesQ.data ?? [];

    const nameById = new Map<string, string>(cats.map((c) => [c.id, c.nome]));
    const map = new Map<string, number>();

    for (const t of tx) {
      if (t.tipo !== "DESPESA") continue;
      const key = t.categoriaId ?? "uncategorized";
      map.set(key, (map.get(key) ?? 0) + toNumber(t.valor));
    }

    return Array.from(map.entries())
      .map(([id, value]) => ({
        id,
        nome: id === "uncategorized" ? "Sem categoria" : nameById.get(id) ?? "Categoria",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [monthTxQ.data, categoriesQ.data]);

  const upcomingEvents = useMemo((): UpcomingEvent[] => {
    const events: UpcomingEvent[] = [];

    const invoice: FaturaCartao | undefined = invoiceQ.data ?? undefined;
    if (invoice) {
      const previsto = toNumber(invoice.totalPrevisto);
      const pago = toNumber(invoice.totalPago);
      const aberto = Math.max(0, previsto - pago);

      events.push({
        title: "Fatura do Cartão",
        subtitle: invoice.status === "ABERTA" ? "Aberta" : invoice.status,
        due: safeDateBR(invoice.vencimento),
        amount: aberto,
        kind: "DESPESA",
      });
    }

    const plans: PlanoParcelamento[] = plansQ.data ?? [];
    const parcelas: Parcela[] = plans.flatMap((p) => p.parcelas ?? []);

    const pendentesComVencimento = parcelas.filter(
      (x) => x.status === "PENDENTE" && !!x.vencimento
    );

    const nextParcela = pendentesComVencimento.sort((a, b) => {
      const da = new Date(a.vencimento as string).getTime();
      const db = new Date(b.vencimento as string).getTime();
      return da - db;
    })[0];

    if (nextParcela) {
      events.push({
        title: "Parcela (próximo venc.)",
        subtitle: `Competência ${nextParcela.competencia}`,
        due: safeDateBR(nextParcela.vencimento),
        amount: toNumber(nextParcela.valor),
        kind: "DESPESA",
      });
    } else {
      const ativos = plans.filter((p) => p.status === "ATIVO").length;
      if (ativos > 0) {
        events.push({
          title: "Parcelamentos",
          subtitle: `${ativos} plano(s) ativo(s)`,
          amount: 0,
          kind: "DESPESA",
        });
      }
    }

    return events.slice(0, 3);
  }, [invoiceQ.data, plansQ.data]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mt: 1 }}>
        Financial Surface
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Dashboard dinâmica (models Prisma: Conta, Transacao, Fatura, Parcelas).
      </Typography>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <GlassCard sx={{ p: 2.5, minHeight: 110 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography color="text.secondary">Saldo total</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 28, mt: 0.5 }}>
                  {formatMoneyBR(totalBalance)}
                </Typography>
              </Box>
              <Chip label={accountsQ.isFetching ? "Atualizando..." : "Live"} size="small" />
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard sx={{ p: 2.5, minHeight: 110 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography color="text.secondary">Fluxo do mês ({competencia})</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                  <Typography sx={{ fontWeight: 800 }} color="success.main">
                    + {formatMoneyBR(totals.receita)}
                  </Typography>
                  <Typography sx={{ fontWeight: 800 }} color="error.main">
                    - {formatMoneyBR(totals.despesa)}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Despesa paga: {formatMoneyBR(totals.despesaPaga)}
                </Typography>
              </Box>
              <Chip label={competencia} variant="outlined" size="small" />
            </Stack>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Upcoming */}
      <SectionTitle
        title="Upcoming Financial Events"
        subtitle="Fatura atual do cartão + próximos vencimentos de parcelas"
      />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {upcomingEvents.length === 0 ? (
          <Grid item xs={12}>
            <GlassCard sx={{ p: 2.5 }}>
              <Typography color="text.secondary">
                Sem eventos (sem fatura atual e sem parcelas pendentes com vencimento).
              </Typography>
            </GlassCard>
          </Grid>
        ) : (
          upcomingEvents.map((e) => (
            <Grid key={`${e.title}-${e.due ?? "no-due"}`} item xs={12} md={4}>
              <GlassCard sx={{ p: 2.5, minHeight: 120 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Chip
                    label={e.due ?? "—"}
                    size="small"
                    sx={{ background: "rgba(255,255,255,0.06)" }}
                  />
                  <IconButton size="small">
                    <ArrowForwardRounded />
                  </IconButton>
                </Stack>

                <Typography sx={{ mt: 1.5, fontWeight: 650 }}>{e.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {e.subtitle}
                </Typography>

                <Typography
                  sx={{ mt: 1.5, fontWeight: 900, fontSize: 18 }}
                  color={e.kind === "RECEITA" ? "success.main" : "error.main"}
                >
                  {e.amount
                    ? `${e.kind === "RECEITA" ? "+" : "-"} ${formatMoneyBR(Math.abs(e.amount))}`
                    : "—"}
                </Typography>
              </GlassCard>
            </Grid>
          ))
        )}
      </Grid>

      {/* Category Insights */}
      <SectionTitle title="Category Insights" subtitle="Top despesas por categoria no mês" />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {topCategories.length === 0 ? (
          <Grid item xs={12}>
            <GlassCard sx={{ p: 2.5 }}>
              <Typography color="text.secondary">Sem despesas categorizadas neste mês.</Typography>
            </GlassCard>
          </Grid>
        ) : (
          topCategories.map((c) => (
            <Grid key={c.id} item xs={12} sm={6} md={3}>
              <GlassCard sx={{ p: 2.8, minHeight: 120, textAlign: "center" }}>
                <Typography sx={{ fontWeight: 900, fontSize: 26 }}>
                  {formatMoneyBR(c.value)}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {c.nome}
                </Typography>
              </GlassCard>
            </Grid>
          ))
        )}
      </Grid>

      {/* Data Blocks */}
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mt: 5, mb: 2 }}>
        <Box>
          <Typography variant="h5">Data Blocks</Typography>
          <Typography color="text.secondary">Últimas transações</Typography>
        </Box>
        <Chip label="Recente" variant="outlined" />
      </Stack>

      <Grid container spacing={2}>
        {(recentTxQ.data ?? []).map((t) => (
          <Grid key={t.id} item xs={12} md={4}>
            <GlassCard sx={{ p: 2.5, minHeight: 140 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Chip
                  label={t.tipo}
                  size="small"
                  sx={{ background: "rgba(255,255,255,0.06)" }}
                />
                <IconButton size="small">
                  <MoreHorizRounded />
                </IconButton>
              </Stack>

              <Typography
                sx={{ mt: 2, fontWeight: 900, fontSize: 22 }}
                color={t.tipo === "RECEITA" ? "success.main" : "error.main"}
              >
                {t.tipo === "RECEITA" ? "+" : "-"} {formatMoneyBR(toNumber(t.valor))}
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {t.descricao}
              </Typography>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {safeDateTimeBR(t.data)} • {t.status} • {t.origem}
              </Typography>
            </GlassCard>
          </Grid>
        ))}

        {recentTxQ.data?.length === 0 && (
          <Grid item xs={12}>
            <GlassCard sx={{ p: 2.5 }}>
              <Typography color="text.secondary">Nenhuma transação encontrada.</Typography>
            </GlassCard>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
