import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SkeletonChart, SkeletonStatGrid } from "@/components/ui/Skeleton";
import { AreaChart, BarChart, ChartFrame, DonutChart } from "@/components/charts";
import { IconChart, IconDownload } from "@/components/ui/icons";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { useUser } from "@/features/auth";
import { buildInsights, snapshotToRows } from "@/entities/analytics/overview";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format/numbers";
import { downloadCsv, downloadJson, exportFilename } from "@/lib/export";

/**
 * Analytics page.
 *
 * Every visualisation is computed in-browser from the cached entities, so the
 * page works offline, needs no analytics vendor and can be exported to CSV or
 * JSON for reporting. The chart components are local SVG primitives, which keeps
 * the theme tokens (accent colour, density) working inside the charts.
 */
function AnalyticsPage() {
  const { t } = useT();
  const { user } = useUser();
  const data = useDashboardData(user, user?.role);
  useDocumentTitle(t("analytics.title"));

  const insights = useMemo(
    () => buildInsights(data.snapshot, data.projects),
    [data.projects, data.snapshot]
  );

  if (data.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonStatGrid />
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("analytics.title")}
        description={t("analytics.subtitle")}
        icon={<IconChart />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<IconDownload />}
              onClick={() =>
                downloadCsv(
                  exportFilename("analytics", "csv"),
                  snapshotToRows(data.snapshot) as Array<Record<string, unknown>>,
                  [
                    { key: "metric", label: "metric" },
                    { key: "value", label: "value" },
                  ] as never
                )
              }>
              {t("analytics.exportCsv")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadJson(exportFilename("analytics", "json"), data.snapshot)}>
              {t("analytics.exportJson")}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("stats.acceptanceRate")}
          value={formatPercent(data.snapshot.rates.acceptanceRate)}
          icon={<span aria-hidden="true">🎯</span>}
          tone="primary"
        />
        <StatCard
          title={t("stats.proposalsPerProject")}
          value={data.snapshot.rates.averageProposalsPerProject.toFixed(1)}
          icon={<span aria-hidden="true">📨</span>}
          tone="info"
        />
        <StatCard
          title={t("stats.averageDelivery")}
          value={`${formatNumber(data.snapshot.rates.averageDeliveryDays)} ${t("common.days")}`}
          icon={<span aria-hidden="true">⏱️</span>}
          tone="warning"
        />
        <StatCard
          title={t("stats.released")}
          value={formatCurrency(data.snapshot.money.released, { compact: true })}
          icon={<span aria-hidden="true">💸</span>}
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartFrame
          title={t("analytics.timeline")}
          subtitle={t("analytics.timelineHint")}
          data={data.snapshot.timeline}
          className="xl:col-span-2"
          legend={[
            { label: t("stats.totalProjects"), color: "rgb(var(--color-primary-600))" },
            { label: t("stats.totalProposals"), color: "rgb(var(--color-success))" },
          ]}>
          <AreaChart data={data.snapshot.timeline} showSecondary height={260} />
        </ChartFrame>

        <ChartFrame title={t("analytics.categories")} data={data.snapshot.categoryDistribution}>
          <DonutChart data={data.snapshot.categoryDistribution} centerLabel={t("field.projects")} />
        </ChartFrame>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartFrame
          title={t("analytics.budgetBuckets")}
          subtitle={t("analytics.budgetBucketsHint")}
          data={data.snapshot.budgetBuckets}>
          <BarChart data={data.snapshot.budgetBuckets} colored />
        </ChartFrame>

        <ChartFrame title={t("analytics.status")} data={data.snapshot.statusDistribution}>
          <DonutChart data={data.snapshot.statusDistribution} centerLabel={t("field.proposals")} />
        </ChartFrame>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-black text-ink">{t("analytics.insights")}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {insights.map((insight, index) => (
            <li key={`${insight.key}-${index}`}>
              <Callout tone="info">{t(insight.key, insight.params)}</Callout>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default AnalyticsPage;
