import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonStatGrid } from "@/components/ui/Skeleton";
import { Callout } from "@/components/ui/Callout";
import { useT } from "@/store/i18n";
import { computeMatchScore } from "@/entities/proposal/matching";
import type { Project, User } from "@/types";
import ProposalForm from "../proposals/ProposalForm";
import ProjectCard, { ProjectCardActions } from "./ProjectCard";

export interface BrowseProjectsProps {
  readonly projects: Project[];
  readonly user?: User;
  readonly isLoading?: boolean;
  readonly error?: unknown;
  readonly onRetry?: () => void;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly limit?: number;
  readonly columns?: 2 | 3;
}

/**
 * Freelancer-facing project discovery.
 *
 * Two domain ideas meet here: ranking (every card carries an explainable match
 * score for the signed-in freelancer) and one-click application (the proposal
 * form opens from the card with the project pre-loaded, so there is no
 * navigation detour).
 */
export function BrowseProjects({
  projects,
  user,
  isLoading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  limit,
  columns = 3,
}: Readonly<BrowseProjectsProps>) {
  const { t, locale } = useT();
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const ranked = useMemo(() => {
    const list = projects.map((project) => ({
      project,
      score: user
        ? computeMatchScore(project, {
            user,
            competitorCount: project.proposals?.length ?? 0,
          })
        : undefined,
    }));
    if (!user) return list;
    return [...list].sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0));
  }, [projects, user]);

  if (isLoading) return <SkeletonStatGrid count={6} />;

  if (error) {
    return (
      <Callout tone="danger" title={t("common.error")}>
        {t("common.errorHint")}
        {onRetry ? (
          <button type="button" onClick={onRetry} className="ms-2 font-bold underline">
            {t("common.retry")}
          </button>
        ) : null}
      </Callout>
    );
  }

  if (ranked.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? t("projects.emptyTitle")}
        description={emptyDescription ?? t("projects.emptyFreelancer")}
      />
    );
  }

  const visible = limit ? ranked.slice(0, limit) : ranked;

  return (
    <>
      <ul
        className={`grid gap-4 ${columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        {visible.map(({ project, score }) => (
          <li key={project._id}>
            <ProjectCard
              project={project}
              score={score}
              href={`/freelancer/projects/${project._id}`}
              footer={
                <ProjectCardActions
                  project={project}
                  onPropose={
                    project.status === "OPEN" ? () => setActiveProject(project) : undefined
                  }
                />
              }
            />
          </li>
        ))}
      </ul>

      <Modal
        isOpen={Boolean(activeProject)}
        onClose={() => setActiveProject(null)}
        title={t("proposals.createFor", {
          title: (locale === "en" && activeProject?.titleEn ? activeProject.titleEn : activeProject?.title) ?? "",
        })}
        size="lg"
        description={t("simulator.subtitle")}>
        {activeProject ? (
          <ProposalForm project={activeProject} onClose={() => setActiveProject(null)} />
        ) : null}
      </Modal>
    </>
  );
}

export default BrowseProjects;
