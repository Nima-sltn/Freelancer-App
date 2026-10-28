import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge, ProjectStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Callout } from "@/components/ui/Callout";
import { ProgressRing } from "@/components/ui/Progress";
import { ErrorState } from "@/components/ui/EmptyState";
import { SkeletonText } from "@/components/ui/Skeleton";
import { Timeline } from "@/components/ui/Timeline";
import { IconCalendar, IconMoney, IconUsers } from "@/components/ui/icons";
import { useUser } from "@/features/auth";
import { useProject } from "@/features/projects/useProjects";
import { useProposals } from "@/features/proposals/useProposals";
import { ProposalsTable } from "@/features/proposals/ProposalsTable";
import { ProposalForm } from "@/features/proposals/ProposalForm";
import { auditViewModel } from "@/features/projects/projectHistory";
import { computeMatchScore } from "@/entities/proposal/matching";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatCurrency, formatNumber } from "@/lib/format/numbers";
import { formatDate, formatRelative, getDeadlineInfo } from "@/lib/format/dates";

/**
 * Project detail.
 *
 * The richest page in the product, and the clearest example of the cross-domain
 * work: it combines the role-aware action set (apply / review / manage), the
 * explainable match score, the risk-screened proposal list and a derived project
 * history — all from the same cache entry.
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
    ? proposalsQuery.proposals.find((proposal) => proposal.projectId === project._id)
    : undefined;

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
            {project.status === "OPEN" && !myProposal && user && project.owner?._id !== user._id ? (
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
                  <dd
                    className={
                      deadline.tone === "danger"
                        ? "text-xs font-bold text-danger"
                        : deadline.tone === "warning"
                          ? "text-xs font-bold text-warning"
                          : "text-xs text-ink-muted"
                    }>
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
              {t(`status.proposal.${myProposal.status === 2 ? "accepted" : myProposal.status === 0 ? "rejected" : "pending"}`)}
            </Callout>
          ) : null}

          {isOwner || isAdmin ? (
            project.proposals?.length ? (
              <ProposalsTable
                proposals={project.proposals}
                canReview
                emptyTitle={t("proposals.emptyTitle")}
              />
            ) : (
              <Callout tone="neutral">{t("projects.proposalCount", { count: 0 })}</Callout>
            )
          ) : null}
        </div>

        <div className="space-y-6">
          {match ? (
            <Card>
              <CardHeader
                title={t("matching.title")}
                description={t("matching.explain")}
                actions={
                  <Badge tone={match.tier === "excellent" ? "success" : match.tier === "weak" ? "danger" : "info"}>
                    {t(`matching.tier.${match.tier}`)}
                  </Badge>
                }
              />
              <CardContent>
                <div className="flex items-center gap-5">
                  <ProgressRing
                    value={match.score}
                    tone={match.score >= 80 ? "success" : match.score >= 60 ? "info" : "warning"}
                    label={`${t("matching.title")}: ${match.score}`}>
                    <span className="text-xl font-black text-ink tabular-nums">
                      {formatNumber(match.score)}
                    </span>
                  </ProgressRing>

                  <ul className="flex-1 space-y-2.5">
                    {match.factors.map((factor) => (
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
          ) : null}

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
