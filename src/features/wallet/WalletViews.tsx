import { useMemo } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { AreaChart } from "@/components/charts";
import { IconDownload, IconMoney, IconWallet } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { PLATFORM_FEE_RATE } from "@/config/constants";
import { formatCurrency, formatPercent } from "@/lib/format/numbers";
import { formatDate } from "@/lib/format/dates";
import { exportFilename, downloadCsv } from "@/lib/export";
import { buildLedger, ledgerSeries, ledgerTotals } from "@/entities/ledger";
import type { LedgerEntry, Proposal, UserRole } from "@/types";

/**
 * Ledger derivation, now a thin wrapper over `entities/ledger`.
 *
 * The maths moved into an entity so the wallet page, the dashboards and the CSV
 * export all read the same escrow numbers — and so the derivation is unit-tested
 * without a DOM. This hook only adds memoisation.
 */
export function useLedger(role: UserRole | undefined, proposals: Proposal[]): LedgerEntry[] {
  return useMemo(() => buildLedger({ role, proposals }), [proposals, role]);
}

function useLedgerSeries(entries: LedgerEntry[]) {
  return useMemo(() => ledgerSeries(entries), [entries]);
}

export function LedgerTable({ entries, isLoading }: { entries: LedgerEntry[]; isLoading?: boolean }) {
  const { t } = useT();

  const columns: Array<Column<LedgerEntry>> = [
    {
      key: "kind",
      header: t("wallet.transactions"),
      render: (entry) => (
        <div className="min-w-40">
          <p className="font-bold text-ink">{t(`wallet.kind.${entry.kind}`)}</p>
          {entry.projectTitle ? (
            <p className="mt-0.5 text-xs text-ink-muted">{entry.projectTitle}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "amount",
      header: t("field.amount"),
      sortable: true,
      render: (entry) => (
        <span
          className={
            entry.kind === "payout"
              ? "font-bold text-success tabular-nums"
              : entry.kind === "fee"
                ? "font-bold text-danger tabular-nums"
                : "font-bold text-ink tabular-nums"
          }>
          {entry.kind === "fee" ? "-" : ""}
          {formatCurrency(entry.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      render: (entry) => (
        <Badge
          tone={entry.status === "settled" ? "success" : entry.status === "pending" ? "warning" : "danger"}>
          {t(`wallet.status.${entry.status}`)}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: t("common.created"),
      hideOnMobile: true,
      render: (entry) => <span className="text-xs text-ink-muted">{formatDate(entry.createdAt)}</span>,
    },
  ];

  return (
    <DataTable<LedgerEntry>
      columns={columns}
      rows={entries}
      rowKey={(entry) => entry.id}
      caption={t("wallet.transactions")}
      isLoading={isLoading}
      emptyTitle={t("wallet.noTransactions")}
    />
  );
}

export function WalletOverview({
  entries,
  isLoading,
}: {
  entries: LedgerEntry[];
  isLoading?: boolean;
}) {
  const { t } = useT();
  const series = useLedgerSeries(entries);

  const totals = useMemo(() => ledgerTotals(entries), [entries]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("stats.released")}
          value={formatCurrency(totals.released, { compact: true })}
          icon={<IconWallet />}
          tone="success"
        />
        <StatCard
          title={t("wallet.inEscrow")}
          value={formatCurrency(totals.pending, { compact: true })}
          icon={<span aria-hidden="true">🔒</span>}
          tone="warning"
          hint={`${t("wallet.ledgerHint", { rate: formatPercent(PLATFORM_FEE_RATE) })}`}
        />
        <StatCard
          title={t("wallet.fees")}
          value={formatCurrency(totals.fees, { compact: true })}
          icon={<span aria-hidden="true">🏦</span>}
          tone="danger"
        />
        <StatCard
          title={t("wallet.totalEarned")}
          value={formatCurrency(totals.escrow, { compact: true })}
          icon={<IconMoney />}
          tone="primary"
        />
      </div>

      <Card>
        <CardHeader
          title={t("wallet.transactions")}
          description={t("wallet.subtitle")}
          icon={<IconWallet />}
          actions={
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<IconDownload />}
              onClick={() =>
                downloadCsv(
                  exportFilename("ledger", "csv"),
                  entries as unknown as Array<Record<string, unknown>>,
                  [
                    { key: "id", label: "id" },
                    { key: "kind", label: "kind" },
                    { key: "status", label: "status" },
                    { key: "amount", label: "amount" },
                    { key: "projectTitle", label: "project" },
                    { key: "createdAt", label: "createdAt" },
                  ] as never
                )
              }>
              {t("wallet.exportCsv")}
            </Button>
          }
        />
        <CardContent>
          <AreaChart data={series} height={200} />
        </CardContent>
      </Card>

      <Callout tone="info">{t("wallet.deployHint")}</Callout>

      <LedgerTable entries={entries.slice(0, 40)} isLoading={isLoading} />
    </div>
  );
}
