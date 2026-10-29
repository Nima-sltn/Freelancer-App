import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "@/features/auth";
import { useProject } from "@/features/projects/useProjects";
import { useProposals } from "@/features/proposals/useProposals";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/store/i18n";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, ProjectStatusBadge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { ProgressRing } from "@/components/ui/Progress";
import { Timeline } from "@/components/ui/Timeline";
import { ErrorState } from "@/components/ui/EmptyState";
import { SkeletonText } from "@/components/ui/Skeleton";
import { ProposalsTable } from "@/features/proposals/ProposalsTable";
import { ProposalForm } from "@/features/proposals/ProposalForm";
import { computeMatchScore } from "@/entities/proposal/matching";
import { auditViewModel } from "@/features/projects/projectHistory";
import { formatCurrency, formatNumber } from "@/lib/format/numbers";
import { formatDate, formatRelative, getDeadlineInfo } from "@/lib/format/dates";
import type { MatchScore, Proposal } from "@/types";

function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconMoney() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function getDeadlineClassName(tone?: string): string {
  if (tone === "danger") return "text-xs font-bold text-danger";
  if (tone === "warning") return "text-xs font-bold text-warning";
  return "text-xs text-ink-muted";
}

function getProposalStatusKey(status?: number): string {
  if (status === 2) return "accepted";
  if (status === 0) return "rejected";
  return "pending";
}

function getTierBadgeTone(tier: string): "success" | "danger" | "info" {
  if (tier === "excellent") return "success";
  if (tier === "weak") return "danger";
  return "info";
}

function getMatchRingTone(score: number): "success" | "info" | "warning" {
  if (score >= 80) return "success";
  if (score >= 60) return "info";
  return "warning";
}

interface MatchCardProps {
  readonly match: MatchScore;
}

function ProjectMatchCard({ match }: Readonly<MatchCardProps>) {
  const { t } = useT();

  return (
    <Card>
      <CardHeader
        title={t("matching.title")}
        description={t("matching.explain")}
        actions={
          <Badge tone={getTierBadgeTone(match.tier)}>
            {t(`matching.tier.${match.tier}`)}
          </Badge>
        }
      />
      <CardContent>
        <div className="flex items-center gap-5">
          <ProgressRing
            value={match.score}
            tone={getMatchRingTone(match.score)}
            label={`${t("matching.title")}: ${match.score}`}>
            <span className="text-xl font-black text-ink tabular-nums">
              {formatNumber(match.score)}
            </span>
          </ProgressRing>

          <ul className="flex-1 space-y-2.5">
            {match.factors.map((factor: MatchScore["factors"][number]) => (
              <li key={factor.key} className="text-xs">
                <div className="flex items-center justify-between gap-2 font-bold text-ink-soft">
                  <span>{t(factor.labelKey)}</span>
                  <span className="tabular-nums">{formatNumber(Math.round(factor.value))}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{ width: `${factor.value}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProposalsSectionProps {
  readonly proposals?: readonly (string | Proposal)[];
}

function ProjectProposalsSection({ proposals }: Readonly<ProposalsSectionProps>) {
  const { t } = useT();

  if (proposals && proposals.length > 0) {
    return (
      <ProposalsTable
        proposals={proposals as Proposal[]}
        canReview
        emptyTitle={t("proposals.emptyTitle")}
      />
    );
  }

  return <Callout tone="neutral">{t("projects.proposalCount", { count: 0 })}</Callout>;
}

/**
 * Project detail view.
 */
function ProjectDetailPage() {
  const { t, locale } = useT();
  const { id } = useParams();
  const { user } = useUser();
  const { project, isLoading, error, refetch } = useProject(id);
  const proposalsQuery = useProposals({ sort: "latest" });
  const [applying, setApplying] = useState(false);

  const isEn = locale === "en";
  const displayTitle = (isEn && project?.titleEn ? project.titleEn : project?.title) ?? t("projects.detail");
  const displayDesc = isEn && project?.descriptionEn ? project.descriptionEn : project?.description;
  const displayCategory = isEn ? (project?.category?.englishTitle || project?.category?.title) : project?.category?.title;

  useDocumentTitle(displayTitle);

  const isOwner = user?.role === "OWNER";
  const isFreelancer = user?.role === "FREELANCER";
  const isAdmin = user?.role === "ADMIN";

  const match = useMemo(
    () => (project && isFreelancer && user ? computeMatchScore(project, { user }) : undefined),
    [isFreelancer, project, user]
  );

  const history = useMemo(() => (project ? auditViewModel(project) : []), [project]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonText lines={2} />
        <div className="skeleton h-40" />
      </div>
    );
  }

  if (error || !project) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const deadline = getDeadlineInfo(project.deadline);
  const myProposal = isFreelancer
    ? proposalsQuery.proposals.find((proposal: Proposal) => proposal.projectId === project._id)
    : undefined;

  const canApply = project.status === "OPEN" && !myProposal && user && project.owner?._id !== user._id;

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayTitle}
        description={displayCategory}
        showBack
        icon={<IconCalendar />}
        breadcrumb={[
          { label: t("nav.projects"), to: `/${user?.role.toLowerCase()}/projects` },
          { label: displayTitle },
        ]}
        actions={
          <>
            <ProjectStatusBadge status={project.status} />
            {canApply ? (
              <Button onClick={() => setApplying(true)}>{t("proposals.create")}</Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={t("common.details")} description={project.tags?.join(" · ")} />
            <CardContent>
              <p className="prose-fa text-sm leading-8 text-ink-soft">{displayDesc}</p>

              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-surface-sunken p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
                    <IconMoney aria-hidden="true" /> {t("field.budget")}
                  </dt>
                  <dd className="mt-1 text-lg font-black text-ink tabular-nums">
                    {formatCurrency(project.budget)}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-sunken p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
                    <IconCalendar aria-hidden="true" /> {t("field.deadline")}
                  </dt>
                  <dd className="mt-1 text-lg font-black text-ink">
                    {formatDate(project.deadline)}
                  </dd>
                  <dd className={getDeadlineClassName(deadline.tone)}>
                    {deadline.isOverdue
                      ? t("projects.overdue", { days: Math.abs(deadline.days) })
                      : t("projects.deadlineSoon", { days: deadline.days })}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-sunken p-3">
                  <dt className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
                    <IconUsers aria-hidden="true" /> {t("field.proposals")}
                  </dt>
                  <dd className="mt-1 text-lg font-black text-ink tabular-nums">
                    {formatNumber(project.proposals?.length ?? 0)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {myProposal ? (
            <Callout tone="info" title={t("projects.yourProposal")}>
              {formatCurrency(myProposal.price)} · {myProposal.duration} {t("common.days")} ·{" "}
              {t(`status.proposal.${getProposalStatusKey(myProposal.status)}`)}
            </Callout>
          ) : null}

          {isOwner || isAdmin ? (
            <ProjectProposalsSection proposals={project.proposals} />
          ) : null}
        </div>

        <div className="space-y-6">
          {match ? <ProjectMatchCard match={match} /> : null}

          <Card>
            <CardHeader title={t("projects.history")} />
            <CardContent>
              <Timeline items={history} emptyMessage={t("audit.empty")} />
            </CardContent>
          </Card>

          {project.freelancer ? (
            <Card>
              <CardHeader title={t("projects.awarded")} />
              <CardContent>
                <p className="text-sm font-bold text-ink">
                  {(project.freelancer as { name?: string }).name ?? "—"}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {t("common.updated")}: {formatRelative(project.updatedAt ?? project.createdAt)}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Modal
        isOpen={applying}
        onClose={() => setApplying(false)}
        title={t("proposals.createFor", { title: project.title })}
        size="lg">
        <ProposalForm project={project} onClose={() => setApplying(false)} />
      </Modal>
    </div>
  );
}

export default ProjectDetailPage;
