import { useEffect } from "react";
import { useNotifications } from "@/store/notifications";
import type { NotificationInput } from "@/store/notifications";
import { getDeadlineInfo } from "@/lib/format/dates";
import type { Project, Proposal, User } from "@/types";

/**
 * Turns domain state into notifications.
 *
 * Without a push channel the client can still be genuinely useful: it observes
 * the data it already fetched and raises an entry the first time it sees a new
 * event (a fresh proposal on your project, an accepted bid, a deadline inside
 * three days). Deterministic ids make this idempotent — re-rendering or
 * re-fetching never duplicates a notification.
 */
export function useDerivedNotifications({
  user,
  projects,
  proposals,
  users = [],
}: {
  user: User | undefined;
  projects: Project[];
  proposals: Proposal[];
  users?: User[];
}) {
  const { merge } = useNotifications();
  const role = user?.role;
  const userId = user?._id;

  useEffect(() => {
    if (!user) return;
    const incoming: NotificationInput[] = [];

    if (role === "OWNER" || role === "ADMIN") {
      const ownedIds = new Set(projects.map((project) => project._id));
      projects.forEach((project) => {
        (project.proposals ?? []).forEach((proposal) => {
          if (role === "OWNER" && !ownedIds.has(project._id)) return;
          incoming.push({
            id: `proposal-created-${proposal._id}`,
            kind: "proposal.created",
            titleKey: "notifications.derived.proposal",
            params: { project: project.title },
            href: `/owner/projects/${project._id}`,
            severity: "info",
            createdAt: proposal.createdAt ?? new Date().toISOString(),
          });
        });
      });
    }

    if (role === "FREELANCER") {
      proposals
        .filter((proposal) => proposal.status === 2)
        .forEach((proposal) => {
          incoming.push({
            id: `proposal-accepted-${proposal._id}`,
            kind: "proposal.accepted",
            titleKey: "notifications.derived.accepted",
            params: { project: proposal.project?.title ?? "" },
            href: "/freelancer/proposals",
            severity: "success",
            createdAt: proposal.updatedAt ?? proposal.createdAt ?? new Date().toISOString(),
          });
        });
    }

    projects
      .filter((project) => project.status === "OPEN")
      .forEach((project) => {
        const info = getDeadlineInfo(project.deadline);
        if (!info.isOverdue && info.days <= 3) {
          incoming.push({
            id: `deadline-${project._id}`,
            kind: "project.closed",
            titleKey: "notifications.derived.deadline",
            params: { project: project.title },
            href: role === "OWNER" ? `/owner/projects/${project._id}` : "/freelancer/projects",
            severity: "warning",
            createdAt: new Date().toISOString(),
          });
        }
      });

    if (role === "ADMIN") {
      users
        .filter((item) => Number(item.status) === 1)
        .forEach((item) => {
          incoming.push({
            id: `user-pending-${item._id}`,
            kind: "user.verified",
            titleKey: "users.moderationQueue",
            params: { name: item.name || item.phoneNumber },
            href: "/admin/users",
            severity: "warning",
            createdAt: item.createdAt ?? new Date().toISOString(),
          });
        });
    }

    merge(incoming);
    // `merge` is stable; intentionally keyed on the derived data only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, proposals, role, userId, users.length]);
}

export default useDerivedNotifications;
