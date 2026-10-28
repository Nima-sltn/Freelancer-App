import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProposalBoard } from "@/features/proposals/ProposalBoard";
import { useProposals, enrichWithProjects } from "@/features/proposals/useProposals";
import { useProjects } from "@/features/projects/useProjects";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { IconBoard } from "@/components/ui/icons";

/** Full-page Kanban view of the freelancer's proposal pipeline. */
function BoardPage() {
  const { t } = useT();
  useDocumentTitle(t("nav.board"));

  const proposalsQuery = useProposals({ sort: "latest" });
  const projectsQuery = useProjects({});

  const proposals = useMemo(
    () => enrichWithProjects(proposalsQuery.proposals, projectsQuery.projects),
    [projectsQuery.projects, proposalsQuery.proposals]
  );

  return (
    <div>
      <PageHeader
        title={t("proposals.board")}
        description={t("proposals.boardHint")}
        icon={<IconBoard />}
      />
      <ProposalBoard proposals={proposals} isLoading={proposalsQuery.isLoading} />
    </div>
  );
}

export default BoardPage;
