import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Timeline, type TimelineItem } from "@/components/ui/Timeline";
import { AreaChart, BarChart, DonutChart } from "@/components/charts";
import {
  IconBoard,
  IconCheck,
  IconPlus,
  IconShield,
  IconSparkles,
  IconTrendingUp,
} from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format/numbers";
import { formatRelative, getDeadlineInfo } from "@/lib/format/dates";
import type { AnalyticsSnapshot, SeriesPoint } from "@/types";

/** KPI row. Clean 4-column responsive grid with consistent rhythm. */
export function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function MoneyStat({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: number;
  icon?: React.ReactNode;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "info" | "neutral";
}) {
  return (
    <StatCard
      title={title}
      value={formatCurrency(value, { compact: true })}
      icon={icon}
      hint={hint}
    />
  );
}

export function TrendWidget({ data }: { data: SeriesPoint[] }) {
  const { t } = useT();
  return (
    <Card className="rounded-2xl border border-line/70 shadow-xs">
      <CardHeader
        title={t("analytics.timeline")}
        description={t("analytics.timelineHint")}
        icon={<IconTrendingUp className="h-5 w-5" />}
        actions={
          <Button variant="ghost" size="sm" to="/owner/analytics" className="text-xs">
            {t("common.viewAll")}
          </Button>
        }
      />
      <CardContent>
        <AreaChart data={data} showSecondary height={220} />
      </CardContent>
    </Card>
  );
}

export function CategoryWidget({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const { t } = useT();
  return (
    <Card className="rounded-2xl border border-line/70 shadow-xs">
      <CardHeader
        title={t("analytics.categories")}
        icon={<IconBoard className="h-5 w-5" />}
      />
      <CardContent>
        <DonutChart
          data={snapshot.categoryDistribution.slice(0, 6)}
          centerLabel={t("field.projects")}
          size={180}
        />
      </CardContent>
    </Card>
  );
}

export function BudgetWidget({ data }: { data: SeriesPoint[] }) {
  const { t } = useT();
  return (
    <Card className="rounded-2xl border border-line/70 shadow-xs">
      <CardHeader
        title={t("analytics.budgetBuckets")}
        description={t("analytics.budgetBucketsHint")}
      />
      <CardContent>
        <BarChart data={data} height={200} colored valueFormatter={(value) => formatNumber(value)} />
      </CardContent>
    </Card>
  );
}

export function InsightsWidget({
  insights,
}: {
  insights: Array<{ key: string; params: Record<string, string | number> }>;
}) {
  const { t } = useT();
  return (
    <Card className="rounded-2xl border border-line/70 shadow-xs">
      <CardHeader title={t("analytics.insights")} icon={<IconSparkles className="h-5 w-5" />} />
      <CardContent>
        <ul className="space-y-3">
          {insights.map((insight, index) => (
            <li
              key={`${insight.key}-${index}`}
              className="flex items-start gap-2.5 text-xs leading-6 text-ink-soft">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
              <span>{t(insight.key, insight.params)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ActivityWidget({ items, title }: { items: TimelineItem[]; title?: string }) {
  const { t } = useT();
  return (
    <Card className="rounded-2xl border border-line/70 shadow-xs">
      <CardHeader title={title ?? t("dashboard.recentActivity")} />
      <CardContent>
        <Timeline items={items} emptyMessage={t("audit.empty")} />
      </CardContent>
    </Card>
  );
}

export function DeadlinesWidget({
  projects,
  href,
}: {
  projects: Array<{ _id: string; title: string; deadline: string }>;
  href: string;
}) {
  const { t } = useT();

  return (
    <Card className="rounded-2xl border border-line/70 shadow-xs">
      <CardHeader
        title={t("dashboard.upcomingDeadlines")}
        actions={
          <Button variant="ghost" size="sm" to={href} className="text-xs">
            {t("common.viewAll")}
          </Button>
        }
      />
      <CardContent>
        {projects.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-muted">{t("timeline.noDeadlines")}</p>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => {
              const info = getDeadlineInfo(project.deadline);
              return (
                <li
                  key={project._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line/50 bg-surface-sunken/40 p-3">
                  <Link
                    to={`${href}/${project._id}`}
                    className="truncate text-xs font-bold text-ink hover:text-primary-600">
                    {project.title}
                  </Link>
                  <span
                    className={
                      info.tone === "danger"
                        ? "text-xs font-bold text-danger"
                        : info.tone === "warning"
                          ? "text-xs font-bold text-warning"
                          : "text-xs font-semibold text-ink-muted"
                    }>
                    {info.isOverdue
                      ? t("projects.overdue", { days: Math.abs(info.days) })
                      : t("projects.deadlineSoon", { days: info.days })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function QuickActionsWidget({
  actions,
}: {
  actions: Array<{ labelKey: string; to: string; icon: React.ReactNode }>;
}) {
  const { t } = useT();
  return (
    <Card className="rounded-2xl border border-line/70 shadow-xs">
      <CardHeader title={t("dashboard.quickActions")} icon={<IconPlus className="h-5 w-5" />} />
      <CardContent>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {actions.map((action) => (
            <Button
              key={action.to + action.labelKey}
              to={action.to}
              variant="outline"
              leadingIcon={action.icon}
              className="justify-start rounded-xl py-2.5 text-xs font-semibold text-ink hover:bg-surface-sunken">
              {t(action.labelKey)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PipelineWidget({
  data,
  rate,
}: {
  data: SeriesPoint[];
  rate: number;
}) {
  const { t } = useT();
  return (
    <Card className="rounded-2xl border border-line/70 shadow-xs">
      <CardHeader
        title={t("dashboard.yourPipeline")}
        description={`${t("stats.winRate")}: ${formatPercent(rate)}`}
      />
      <CardContent>
        <DonutChart data={data} centerLabel={t("field.proposals")} size={170} />
      </CardContent>
    </Card>
  );
}

export function TrustWidget({
  score,
  level,
  signals,
  xp,
  levelNumber,
  levelProgress,
  badges,
}: {
  score: number;
  level: string;
  signals: Array<{ key: string; labelKey: string; passed: boolean }>;
  xp: number;
  levelNumber: number;
  levelProgress: number;
  badges: string[];
}) {
  const { t } = useT();
  return (
    <Card className="rounded-2xl border border-line/70 shadow-xs">
      <CardHeader
        title={t("trust.title")}
        description={`${t("trust.score")}: ${formatNumber(score)}`}
        icon={<IconShield className="h-5 w-5" />}
        actions={
          <span className="rounded-full bg-primary-500/10 px-2.5 py-0.5 text-xs font-bold text-primary-600 dark:text-primary-400">
            {t(`trust.level.${level}`)}
          </span>
        }
      />
      <CardContent className="space-y-4">
        <ul className="grid gap-2 sm:grid-cols-2">
          {signals.map((signal) => (
            <li key={signal.key} className="flex items-center gap-2 text-xs text-ink-soft">
              {signal.passed ? (
                <IconCheck className="h-4 w-4 text-emerald-500" />
              ) : (
                <span className="h-3 w-3 rounded-full border border-line" />
              )}
              <span>{t(signal.labelKey)}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-line/60 bg-surface-sunken/50 p-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
            <span>
              {t("gamification.level")} {formatNumber(levelNumber)}
            </span>
            <span className="tabular-nums text-ink-muted">
              {t("gamification.xp")}: {formatNumber(xp)}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line/80">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-500"
              style={{ width: `${Math.round(levelProgress * 100)}%` }}
            />
          </div>
          {badges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-lg border border-line/60 bg-surface px-2 py-0.5 text-[0.65rem] font-bold text-ink-muted">
                  {t(`gamification.badge.${badge}`)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function formatTimestamp(value: string | undefined): string {
  return value ? formatRelative(value) : "—";
}
