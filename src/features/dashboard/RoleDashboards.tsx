import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/store/i18n";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format/numbers";
import { formatRelative } from "@/lib/format/dates";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { SkeletonStatGrid } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { Callout } from "@/components/ui/Callout";
import ProjectCard from "@/features/projects/ProjectCard";
import {
  IconBadge,
  IconCalendar,
  IconChart,
  IconChat,
  IconCheck,
  IconDocument,
  IconMoney,
  IconPlus,
  IconShield,
  IconStar,
  IconUsers,
  IconWallet,
} from "@/components/ui/icons";
import type { Project, Proposal, User } from "@/types";
import {
  ActivityWidget,
  BudgetWidget,
  CategoryWidget,
  DeadlinesWidget,
  InsightsWidget,
  MoneyStat,
  PipelineWidget,
  QuickActionsWidget,
  StatsGrid,
  TrendWidget,
  TrustWidget,
} from "./DashboardWidgets";
import type { DashboardData } from "./useDashboardData";

/**
 * Senior UI/UX Redesigned Role Dashboards.
 * Clean information hierarchy, generous whitespace, unified typography,
 * zero decorative clutter or screaming emoji badges.
 */

function getProposalActivityTone(status: number): "success" | "danger" | "primary" {
  if (status === 2) return "success";
  if (status === 0) return "danger";
  return "primary";
}

/* ========================================================================== */
/* Client (Owner) Dashboard                                                   */
/* ========================================================================== */

export function OwnerDashboardView({ data, user }: Readonly<{ readonly data: DashboardData; readonly user: User }>) {
  const { t } = useT();

  const activity = useMemo(
    () =>
      data.proposals.slice(0, 5).map((proposal) => ({
        id: proposal._id,
        title: t("notifications.derived.proposal", {
          project: proposal.project?.title ?? proposal.projectId ?? "",
        }),
        description: `${formatCurrency(proposal.price)} • ${proposal.duration} ${t("common.days")}`,
        at: proposal.createdAt ?? new Date().toISOString(),
        tone: proposal.status === 2 ? ("success" as const) : ("primary" as const),
      })),
    [data.proposals, t]
  );

  const urgent = useMemo(
    () =>
      data.projects
        .filter((project) => project.status === "OPEN")
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, 4),
    [data.projects]
  );

  if (data.isLoading) return <SkeletonStatGrid />;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={t("dashboard.greeting", { name: user.name })}
        description={t("dashboard.subtitle")}
        actions={
          <div className="flex items-center gap-2.5">
            <Button to="/owner/projects" variant="outline" size="sm" className="rounded-xl">
              {t("projects.myTitle")}
            </Button>
            <Button to="/owner/projects" size="sm" leadingIcon={<IconPlus className="h-4 w-4" />} className="rounded-xl">
              {t("projects.create")}
            </Button>
          </div>
        }
      />

      {/* 4-Metric Clean KPI Strip */}
      <StatsGrid>
        <StatCard
          title={t("stats.totalProjects")}
          value={data.owner.total}
          icon={<IconDocument className="h-5 w-5" />}
          hint={`${t("stats.openProjects")}: ${formatNumber(data.owner.open)}`}
        />
        <StatCard
          title={t("stats.totalProposals")}
          value={data.owner.proposalsReceived}
          icon={<IconChat className="h-5 w-5" />}
          hint={`${t("stats.proposalsPerProject")}: ${data.owner.averageProposals.toFixed(1)}`}
        />
        <MoneyStat
          title={t("stats.averageBudget")}
          value={data.snapshot.money.averageBudget}
          icon={<IconMoney className="h-5 w-5" />}
          hint={t("stats.averageBudgetHint")}
        />
        <StatCard
          title={t("stats.acceptanceRate")}
          value={formatPercent(data.snapshot.rates.acceptanceRate)}
          icon={<IconBadge className="h-5 w-5" />}
          hint={`${t("stats.acceptedProposals")}: ${formatNumber(data.snapshot.totals.acceptedProposals)}`}
        />
      </StatsGrid>

      {/* Main Workspace (Asymmetric Layout) */}
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Projects & Timeline */}
        <div className="space-y-8">
          <TrendWidget data={data.snapshot.timeline} />
          <DeadlinesWidget projects={urgent} href="/owner/projects" />
        </div>

        {/* Right Column: Activity, Categories & Actions */}
        <div className="space-y-8">
          <CategoryWidget snapshot={data.snapshot} />
          <ActivityWidget items={activity} title={t("dashboard.recentActivity")} />
          <QuickActionsWidget
            actions={[
              { labelKey: "projects.create", to: "/owner/projects", icon: <IconPlus className="h-4 w-4" /> },
              { labelKey: "nav.wallet", to: "/owner/wallet", icon: <IconWallet className="h-4 w-4" /> },
              { labelKey: "nav.analytics", to: "/owner/analytics", icon: <IconChart className="h-4 w-4" /> },
              { labelKey: "nav.timeline", to: "/owner/timeline", icon: <IconCalendar className="h-4 w-4" /> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Freelancer Dashboard                                                       */
/* ========================================================================== */

export function FreelancerDashboardView({ data, user }: Readonly<{ readonly data: DashboardData; readonly user: User }>) {
  const { t } = useT();

  const activity = useMemo(
    () =>
      data.proposals.slice(0, 5).map((proposal) => ({
        id: proposal._id,
        title: proposal.project?.title ?? t("proposals.title"),
        description: `${formatCurrency(proposal.price)} • ${formatRelative(proposal.createdAt ?? "")}`,
        at: proposal.createdAt ?? new Date().toISOString(),
        tone: getProposalActivityTone(proposal.status),
      })),
    [data.proposals, t]
  );

  if (data.isLoading) return <SkeletonStatGrid />;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={t("dashboard.greeting", { name: user.name })}
        description={t("dashboard.subtitle")}
        actions={
          <div className="flex items-center gap-2.5">
            <Button to="/freelancer/board" variant="outline" size="sm" className="rounded-xl">
              {t("nav.board")}
            </Button>
            <Button to="/freelancer/projects" size="sm" className="rounded-xl">
              {t("nav.projects")}
            </Button>
          </div>
        }
      />

      {/* 4-Metric Clean KPI Strip */}
      <StatsGrid>
        <StatCard
          title={t("stats.totalProposals")}
          value={data.freelancer.proposals}
          icon={<IconDocument className="h-5 w-5" />}
          hint={`${t("stats.activeProposals")}: ${formatNumber(data.freelancer.pending)}`}
        />
        <StatCard
          title={t("stats.acceptedProposals")}
          value={data.freelancer.accepted}
          icon={<IconCheck className="h-5 w-5" />}
          hint={`${t("stats.winRate")}: ${formatPercent(data.freelancer.winRate)}`}
        />
        <MoneyStat
          title={t("stats.wallet")}
          value={data.freelancer.wonValue}
          icon={<IconMoney className="h-5 w-5" />}
          hint={t("stats.wonValueHint")}
        />
        <StatCard
          title={t("stats.rating")}
          value={(user.rating ?? 0).toFixed(1)}
          icon={<IconStar className="h-5 w-5" />}
          hint={`${formatNumber(user.reviewsCount ?? 0)} ${t("field.rating")}`}
        />
      </StatsGrid>

      {/* Main Workspace */}
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Smart Match Opportunities */}
        <div className="space-y-8">
          {data.recommendations.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink">{t("dashboard.recommendations")}</h2>
                  <p className="mt-0.5 text-xs text-ink-muted">{t("dashboard.recommendationsHint")}</p>
                </div>
                <Link
                  to="/freelancer/projects"
                  className="text-xs font-semibold text-primary-600 hover:underline">
                  {t("common.viewAll")}
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {data.recommendations.slice(0, 4).map(({ project, score }) => (
                  <div key={project._id} className="transition-all duration-200 hover:-translate-y-0.5">
                    <ProjectCard
                      project={project}
                      score={score}
                      href={`/freelancer/projects/${project._id}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Callout tone="info">{t("matching.noRecommendations")}</Callout>
          )}

          <ActivityWidget items={activity} title={t("dashboard.recentActivity")} />
        </div>

        {/* Right Column: Pipeline & Trust */}
        <div className="space-y-8">
          <PipelineWidget data={data.freelancer.pipeline} rate={data.freelancer.winRate} />
          {data.trust && data.experience ? (
            <TrustWidget
              score={data.trust.score}
              level={data.trust.level}
              signals={data.trust.signals}
              xp={data.experience.xp}
              levelNumber={data.experience.level}
              levelProgress={data.experience.levelProgress}
              badges={data.experience.badges}
            />
          ) : null}
          <BudgetWidget data={data.snapshot.budgetBuckets} />
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Admin Dashboard                                                            */
/* ========================================================================== */

export function AdminDashboardView({ data, user }: Readonly<{ readonly data: DashboardData; readonly user: User }>) {
  const { t } = useT();

  const pendingUsers = useMemo(
    () => data.users.filter((item) => Number(item.status) === 1),
    [data.users]
  );

  const pendingProposals = useMemo(
    () => data.proposals.filter((proposal) => proposal.status === 1),
    [data.proposals]
  );

  if (data.isLoading) return <SkeletonStatGrid />;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={t("dashboard.greeting", { name: user.name })}
        description={t("analytics.subtitle")}
        actions={
          <div className="flex items-center gap-2.5">
            <Button to="/admin/trust" variant="outline" size="sm" className="rounded-xl">
              {t("nav.trust")}
            </Button>
            <Button to="/admin/users" size="sm" className="rounded-xl">
              {t("users.title")}
            </Button>
          </div>
        }
      />

      {/* 4-Metric Clean KPI Strip */}
      <StatsGrid>
        <StatCard
          title={t("stats.totalUsers")}
          value={data.users.length}
          icon={<IconUsers className="h-5 w-5" />}
          hint={`${t("stats.pendingUsers")}: ${formatNumber(pendingUsers.length)}`}
        />
        <StatCard
          title={t("stats.totalProjects")}
          value={data.snapshot.totals.projects}
          icon={<IconDocument className="h-5 w-5" />}
          hint={`${t("stats.openProjects")}: ${formatNumber(data.snapshot.totals.openProjects)}`}
        />
        <StatCard
          title={t("stats.totalProposals")}
          value={data.snapshot.totals.proposals}
          icon={<IconChat className="h-5 w-5" />}
          hint={`${t("proposal.column.pending")}: ${formatNumber(pendingProposals.length)}`}
        />
        <MoneyStat
          title={t("stats.escrow")}
          value={data.snapshot.money.escrow}
          icon={<IconShield className="h-5 w-5" />}
          hint={t("stats.escrowHint")}
        />
      </StatsGrid>

      {/* Main Workspace */}
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Moderation & Proposals */}
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink">{t("users.moderationQueue")}</h2>
                <p className="mt-0.5 text-xs text-ink-muted">{t("users.moderationHint")}</p>
              </div>
              <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-bold text-ink-muted">
                {formatNumber(pendingUsers.length)} {t("users.countUnit")}
              </span>
            </div>

            {pendingUsers.length === 0 ? (
              <Callout tone="success">{t("users.moderationEmpty")}</Callout>
            ) : (
              <ul className="rounded-2xl border border-line/70 bg-surface divide-y divide-line/60 shadow-xs">
                {pendingUsers.slice(0, 5).map((item) => (
                  <li key={item._id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{item.name || item.phoneNumber}</p>
                      <p className="text-xs text-ink-muted">{t(`role.${item.role}`)}</p>
                    </div>
                    <Button to="/admin/users" variant="outline" size="sm" className="rounded-xl text-xs">
                      {t("users.changeStatus")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <TrendWidget data={data.snapshot.timeline} />
        </div>

        {/* Right Column: Platform Analytics */}
        <div className="space-y-8">
          <CategoryWidget snapshot={data.snapshot} />
          <InsightsWidget insights={data.insights} />
          <BudgetWidget data={data.snapshot.budgetBuckets} />
        </div>
      </div>
    </div>
  );
}

export function DashboardSwitch({
  data,
  user,
}: Readonly<{
  readonly data: DashboardData;
  readonly user: User;
}>) {
  if (user.role === "ADMIN") return <AdminDashboardView data={data} user={user} />;
  if (user.role === "FREELANCER") return <FreelancerDashboardView data={data} user={user} />;
  return <OwnerDashboardView data={data} user={user} />;
}

export type { DashboardData, Project, Proposal };
