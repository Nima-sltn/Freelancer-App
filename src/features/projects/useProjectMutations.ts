import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/config/queryKeys";
import { projectService } from "@/services";
import { command, useTransactions } from "@/store/transaction";
import { useT } from "@/store/i18n";
import { validateProjectPayload } from "@/lib/validators";
import type { CreateProjectData, Project } from "@/types";

/**
 * Project write operations, routed through the transaction manager.
 *
 * Each mutation declares three things the old `useMutation` wrappers could not:
 *  1. an optimistic cache patch (so the table updates instantly),
 *  2. a consistency validator (so an invalid payload never reaches the cache),
 *  3. the invalidation keys needed to reconcile with the server.
 * The result is that a failed request rolls the UI back instead of leaving a
 * ghost row behind — the single most common bug in optimistic interfaces.
 */

function updateList(current: unknown, projectId: string, patch: Partial<Project>): unknown {
  if (!Array.isArray(current)) return current;
  return current.map((item) =>
    (item as Project)?._id === projectId ? { ...(item as Project), ...patch } : item
  );
}

export function useProjectMutations() {
  const queryClient = useQueryClient();
  const { run, undo, isBusy } = useTransactions();
  const { t } = useT();

  const invalidateAll = [
    queryKeys.projects.all,
    queryKeys.projects.owned,
  ];

  const createProject = (data: CreateProjectData, options?: { onSuccess?: () => void }) =>
    run<{ message: string }>({
      resource: "projects",
      labelKey: "audit.project.created",
      labelParams: { title: data.title },
      validate: () => validateProjectPayload(data),
      request: () => projectService.create(data),
      // Serialised twin of `request`, so a write queued offline survives a
      // reload and is re-sent by the outbox (see store/transaction/commands.ts).
      command: command("project.create", { data }),
      invalidate: invalidateAll,
      successMessage: t("projects.create") + " ✓",
      onSuccess: () => options?.onSuccess?.(),
    });

  const updateProject = (id: string, data: CreateProjectData, options?: { onSuccess?: () => void }) =>
    run<{ message: string }>({
      resource: `project:${id}`,
      labelKey: "projects.edit",
      labelParams: { title: data.title },
      validate: () => validateProjectPayload(data),
      patches: [
        {
          queryKey: queryKeys.projects.owned,
          updater: (current) => updateList(current, id, data as unknown as Partial<Project>),
        },
      ],
      request: () => projectService.update(id, data),
      command: command("project.update", { id, data }),
      invalidate: invalidateAll,
      onSuccess: () => options?.onSuccess?.(),
    });

  const toggleStatus = (project: Project, options?: { onSuccess?: () => void }) => {
    const nextStatus = project.status === "OPEN" ? "CLOSED" : "OPEN";
    return run<{ message: string }>({
      resource: `project:${project._id}`,
      labelKey: nextStatus === "OPEN" ? "status.project.open" : "status.project.closed",
      labelParams: { title: project.title },
      patches: [
        {
          queryKey: queryKeys.projects.owned,
          updater: (current) => updateList(current, project._id, { status: nextStatus }),
        },
        {
          queryKey: queryKeys.projects.detail(project._id),
          updater: (current) =>
            current && typeof current === "object"
              ? { ...(current as { project?: Project }), project: { ...project, status: nextStatus } }
              : current,
        },
      ],
      request: () => projectService.changeStatus(project._id, nextStatus),
      command: command("project.changeStatus", { id: project._id, status: nextStatus }),
      invalidate: invalidateAll,
      compensate: () => projectService.changeStatus(project._id, project.status),
      compensateCommand: command("project.changeStatus", {
        id: project._id,
        status: project.status,
      }),
      onSuccess: () => options?.onSuccess?.(),
    });
  };

  const removeProject = (project: Project, options?: { onSuccess?: () => void }) =>
    run<{ message: string }>({
      resource: `project:${project._id}`,
      labelKey: "projects.delete",
      labelParams: { title: project.title },
      patches: [
        {
          queryKey: queryKeys.projects.owned,
          updater: (current) =>
            Array.isArray(current)
              ? current.filter((item) => (item as Project)?._id !== project._id)
              : current,
        },
      ],
      request: () => projectService.remove(project._id),
      command: command("project.remove", { id: project._id }),
      invalidate: invalidateAll,
      onSuccess: () => options?.onSuccess?.(),
    });

  return {
    createProject,
    updateProject,
    toggleStatus,
    removeProject,
    undoLastChange: () => undo(),
    isBusy,
    queryClient,
  };
}

export default useProjectMutations;
