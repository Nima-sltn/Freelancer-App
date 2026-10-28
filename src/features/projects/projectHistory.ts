import { formatRelative } from "@/lib/format/dates";
import { translateDirect } from "@/store/i18n";
import type { TimelineItem } from "@/components/ui/Timeline";
import type { Project } from "@/types";

/**
 * Derives a project's history from the document itself.
 *
 * The API keeps no change log, but timestamps plus proposal statuses reconstruct
 * a useful, honest timeline ("created", "N proposals received", "awarded"). The
 * local transaction journal supplements it with the current user's own writes on
 * the audit page.
 */
export interface AuditViewModelItem extends TimelineItem {
  key: string;
}

export function auditViewModel(project: Project): TimelineItem[] {
  const items: TimelineItem[] = [];

  if (project.createdAt) {
    items.push({
      id: `${project._id}-created`,
      title: translateDirect("projects.history.created"),
      description: (project.owner as { name?: string })?.name
        ? translateDirect("projects.history.by", undefined, { name: (project.owner as { name?: string }).name })
        : undefined,
      at: project.createdAt,
      tone: "primary",
    });
  }

  (project.proposals ?? []).forEach((proposal) => {
    const status = proposal.status;
    items.push({
      id: `${proposal._id}-proposal`,
      title:
        status === 2
          ? translateDirect("projects.history.proposalAccepted")
          : status === 1
            ? translateDirect("projects.history.proposalPending")
            : translateDirect("projects.history.proposalRejected"),
      description: translateDirect("projects.history.proposalMeta", undefined, {
        name: (proposal.user as { name?: string })?.name ?? "",
        days: proposal.duration,
      }),
      at: proposal.createdAt ?? project.createdAt ?? new Date().toISOString(),
      tone: status === 2 ? "success" : status === 1 ? "warning" : "danger",
    });
  });

  if (project.freelancer) {
    items.push({
      id: `${project._id}-awarded`,
      title: translateDirect("projects.history.freelancerAssigned"),
      description: (project.freelancer as { name?: string })?.name,
      at: project.updatedAt ?? project.createdAt ?? new Date().toISOString(),
      tone: "success",
    });
  }

  if (project.status === "CLOSED") {
    items.push({
      id: `${project._id}-closed`,
      title: translateDirect("projects.history.closed"),
      at: project.updatedAt ?? project.createdAt ?? new Date().toISOString(),
      tone: "info",
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export { formatRelative };
