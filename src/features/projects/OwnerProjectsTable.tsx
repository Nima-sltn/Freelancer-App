import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge, ProjectStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/Progress";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconEdit, IconEye, IconTrash, IconUpload } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { formatCurrency } from "@/lib/format/numbers";
import { formatDateShort, getDeadlineInfo } from "@/lib/format/dates";
import { truncate } from "@/lib/format/text";
import type { CategoryOption, Project } from "@/types";
import ProjectForm from "./ProjectForm";
import useProjectMutations from "./useProjectMutations";

/**
 * Owner portfolio table.
 *
 * Row actions are real links/buttons (never click handlers on `<td>`), the
 * status switch is optimistic, and every destructive action goes through a
 * confirmation dialog. The deadline column reuses the shared deadline helper so
 * urgency styling matches the cards and the timeline.
 */
function getDeadlineToneClass(tone?: string): string {
  if (tone === "danger") return "text-danger";
  if (tone === "warning") return "text-warning";
  return "text-ink-soft";
}

export interface OwnerProjectsTableProps {
  readonly projects: readonly Project[];
  readonly categories: CategoryOption[];
  readonly isLoading?: boolean;
  readonly error?: unknown;
  readonly onRetry?: () => void;
  readonly rowLimit?: number;
}

export function OwnerProjectsTable({
  projects,
  categories,
  isLoading,
  error,
  onRetry,
  rowLimit,
}: Readonly<OwnerProjectsTableProps>) {
  const { t, locale } = useT();
  const { removeProject, toggleStatus, isBusy } = useProjectMutations();
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const rows = rowLimit ? projects.slice(0, rowLimit) : projects;
  const maxProposals = Math.max(1, ...projects.map((project) => project.proposals?.length ?? 0));

  const columns: Array<Column<Project>> = [
    {
      key: "title",
      header: t("field.title"),
      sortable: true,
      render: (project) => {
        const isEn = locale === "en";
        const displayTitle = isEn && project.titleEn ? project.titleEn : project.title;
        const displayCategory = isEn ? (project.category?.englishTitle || project.category?.title) : project.category?.title;
        return (
          <div className="min-w-40">
            <Link
              to={`/owner/projects/${project._id}`}
              className="font-bold text-ink hover:text-primary-700">
              {truncate(displayTitle, 34)}
            </Link>
            <p className="mt-0.5 text-xs text-ink-muted">{displayCategory}</p>
          </div>
        );
      },
    },
    {
      key: "budget",
      header: t("field.budget"),
      sortable: true,
      render: (project) => <span className="tabular-nums">{formatCurrency(project.budget)}</span>,
    },
    {
      key: "activity",
      header: t("dashboard.yourPipeline"),
      hideOnMobile: true,
      render: (project) => (
        <div className="w-28">
          <ProgressBar
            value={((project.proposals?.length ?? 0) / maxProposals) * 100}
            size="sm"
            tone="info"
          />
          <p className="mt-1 text-xs text-ink-muted">
            {t("projects.proposalCount", { count: project.proposals?.length ?? 0 })}
          </p>
        </div>
      ),
    },
    {
      key: "deadline",
      header: t("field.deadline"),
      sortable: true,
      hideOnMobile: true,
      render: (project) => {
        const info = getDeadlineInfo(project.deadline);
        return (
          <span
            className={getDeadlineToneClass(info.tone)}>
            {formatDateShort(project.deadline)}
          </span>
        );
      },
    },
    {
      key: "tags",
      header: t("field.tags"),
      hideOnMobile: true,
      render: (project) => (
        <div className="flex max-w-40 flex-wrap gap-1">
          {(project.tags ?? []).slice(0, 2).map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
          {(project.tags?.length ?? 0) > 2 ? (
            <Badge tone="neutral">+{(project.tags?.length ?? 0) - 2}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "freelancer",
      header: t("field.freelancer"),
      hideOnMobile: true,
      render: (project) => {
        const freelancer = project.freelancer as { name?: string } | null | undefined;
        return freelancer?.name ? (
          <span className="text-xs font-bold text-ink-soft">{freelancer.name}</span>
        ) : (
          <span className="text-xs text-ink-muted">{t("projects.noFreelancer")}</span>
        );
      },
    },
    {
      key: "status",
      header: t("common.status"),
      render: (project) => (
        (() => {
          const statusKey = `status.project.${project.status.toLowerCase()}`;
          const statusText = t(statusKey);
          return (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                toggleStatus(project);
              }}
              className="transition-opacity hover:opacity-80"
              title={`${t("common.status")}: ${statusText}`}>
              <ProjectStatusBadge status={project.status} />
            </button>
          );
        })()
      ),
    },
    {
      key: "actions",
      header: t("common.actions"),
      align: "center",
      render: (project) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip content={t("common.details")}>
            <Link
              to={`/owner/projects/${project._id}`}
              aria-label={t("common.details")}
              className="grid h-8 w-8 place-items-center rounded-lg text-primary-700 hover:bg-surface-sunken">
              <IconEye className="h-4 w-4" />
            </Link>
          </Tooltip>
          <Tooltip content={t("projects.edit")}>
            <button
              type="button"
              onClick={() => setEditing(project)}
              aria-label={t("projects.edit")}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken">
              <IconEdit className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content={t("projects.delete")}>
            <button
              type="button"
              onClick={() => setDeleting(project)}
              aria-label={t("projects.delete")}
              className="grid h-8 w-8 place-items-center rounded-lg text-danger hover:bg-danger/10">
              <IconTrash className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable<Project>
        columns={columns}
        rows={rows}
        rowKey={(project) => project._id}
        caption={t("projects.myTitle")}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle={t("projects.emptyTitle")}
        emptyDescription={t("projects.emptyOwner")}
        emptyAction={
          <Button
            to="/owner/projects"
            leadingIcon={<IconUpload />}
            variant="outline"
            size="sm">
            {t("projects.create")}
          </Button>
        }
      />

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={t("projects.edit")}
        size="lg">
        {editing ? (
          <ProjectForm
            categories={categories}
            projectToEdit={editing}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t("projects.delete")}
        message={t("projects.deleteConfirm", { title: deleting?.title ?? "" })}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        tone="danger"
        isLoading={isBusy}
        onConfirm={() => {
          if (!deleting) return;
          removeProject(deleting, { onSuccess: () => setDeleting(null) });
        }}
      />
    </>
  );
}

export default OwnerProjectsTable;
