import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Tabs";
import { ProposalsTable } from "@/features/proposals/ProposalsTable";
import { ProposalBoard } from "@/features/proposals/ProposalBoard";
import { useProposals, enrichWithProjects } from "@/features/proposals/useProposals";
import { useProjects, useOwnerProjects } from "@/features/projects/useProjects";
import { useUser } from "@/features/auth";
import { buildFreelancerPortfolio } from "@/entities/project/metrics";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatCurrency, formatPercent } from "@/lib/format/numbers";
import { IconClipboard } from "@/components/ui/icons";

type View = "table" | "board";

/**
 * Proposals page.
 *
 * Freelancers see their own pipeline in either a table or a Kanban board (the
 * board is the only place a status can be changed by direct manipulation);
 * clients and admins see every proposal that belongs to their projects, with
 * review controls enabled.
 */
function ProposalsPage() {
  const { t } = useT();
  const { user } = useUser();
  const [view, setView] = useState<View>("table");
  useDocumentTitle(t("proposals.title"));

  const isFreelancer = user?.role === "FREELANCER";
  const canReview = user?.role === "OWNER" || user?.role === "ADMIN";

  const proposalsQuery = useProposals({ sort: "latest" });
  const publishedProjects = useProjects({});
  const ownedProjects = useOwnerProjects({});

  const projects = canReview ? ownedProjects.projects : publishedProjects.projects;

  const proposals = useMemo(
    () => enrichWithProjects(proposalsQuery.proposals, projects),
    [proposalsQuery.proposals, projects]
  );

  const scoped = useMemo(() => {
    if (isFreelancer) return proposals;
    const ownedIds = new Set(projects.map((project) => project._id));
    return proposals.filter((proposal) => (proposal.projectId ? ownedIds.has(proposal.projectId) : false));
  }, [isFreelancer, projects, proposals]);

  const stats = useMemo(() => buildFreelancerPortfolio(scoped), [scoped]);
  const isLoading = proposalsQuery.isLoading || (canReview && ownedProjects.isLoading);

  return (
    <div>
      <PageHeader
        title={isFreelancer ? t("proposals.title") : t("nav.proposals")}
        description={t("proposals.subtitle")}
        icon={<IconClipboard />}
        actions={
          isFreelancer ? (
            <>
              <SegmentedControl<View>
                value={view}
                onChange={setView}
                ariaLabel={t("common.filter")}
                size="sm"
                options={[
                  { value: "table", label: t("common.details") },
                  { value: "board", label: t("nav.board") },
                ]}
              />
              <Button to="/freelancer/projects" variant="outline" size="sm">
                {t("nav.projects")}
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("stats.totalProposals")}
          value={stats.proposals}
          icon={<span aria-hidden="true">📨</span>}
          tone="primary"
          hint={`${t("stats.activeProposals")}: ${stats.pending}`}
        />
        <StatCard
          title={t("stats.acceptedProposals")}
          value={stats.accepted}
          icon={<span aria-hidden="true">✅</span>}
          tone="success"
          hint={`${t("stats.winRate")}: ${formatPercent(stats.winRate)}`}
        />
        <StatCard
          title={t("proposals.totalBid")}
          value={formatCurrency(stats.totalBid, { compact: true })}
          icon={<span aria-hidden="true">💰</span>}
          tone="info"
        />
        <StatCard
          title={t("proposals.averageBid")}
          value={formatCurrency(stats.averageBid, { compact: true })}
          icon={<span aria-hidden="true">📊</span>}
          tone="warning"
        />
      </div>

      {view === "board" && isFreelancer ? (
        <ProposalBoard proposals={scoped} isLoading={isLoading} />
      ) : (
        <ProposalsTable
          proposals={scoped}
          isLoading={isLoading}
          error={proposalsQuery.error}
          onRetry={() => proposalsQuery.refetch()}
          canReview={canReview}
          showProject
        />
      )}
    </div>
  );
}

export default ProposalsPage;
