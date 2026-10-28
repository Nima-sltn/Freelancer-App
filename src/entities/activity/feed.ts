import type { AuditEntry, Project, User } from "@/types";

/**
 * The audit feed as a pure function.
 *
 * Two event sources, one chronological truth:
 *
 *  - **remote** — domain events reconstructed from data the client already
 *    holds (a project appearing, a proposal being submitted and later decided,
 *    a member of the platform passing moderation). No endpoint, no tracker.
 *  - **local** — the ACID journal: every optimistic write the user performed,
 *    with its outcome.
 *
 * The merge lives in `entities/` rather than in the audit view on purpose: it
 * is domain logic shared by the audit page, the dashboard activity strip and
 * the CSV export, it must be testable without a DOM, and it must not import
 * React (see `docs/ARCHITECTURE.md`, the dependency rule).
 */
export interface LocalWrite {
  id: string;
  resource: string;
  labelKey: string;
  labelParams?: Record<string, string | number>;
  state: "pending" | "committed" | "rolled-back" | "queued";
  createdAt: string;
  error?: string;
}

export interface AuditFeedInput {
  projects?: Project[];
  users?: User[];
  /** Journal entries, usually `useTransactions().entries`. */
  writes?: LocalWrite[];
  limit?: number;
}

function nameOf(value: unknown): string {
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === "string" && name.trim().length > 0) return name;
  }
  return "—";
}

/** Remote half: what the API already knows happened. */
function remoteEvents(projects: Project[], users: User[]): AuditEntry[] {
  const events: AuditEntry[] = [];

  projects.forEach((project) => {
    if (project.createdAt) {
      events.push({
        id: `project-${project._id}-created`,
        actorName: nameOf(project.owner),
        actionKey: "audit.project.created",
        entity: "project",
        entityLabel: project.title,
        at: project.createdAt,
        source: "remote",
      });
    }

    // A closed project is an event in its own right — moderators and owners
    // both look for "when did this stop being open?".
    if (project.status === "CLOSED" && project.updatedAt) {
      events.push({
        id: `project-${project._id}-closed`,
        actorName: nameOf(project.owner),
        actionKey: "audit.project.closed",
        entity: "project",
        entityLabel: project.title,
        at: project.updatedAt,
        source: "remote",
      });
    }

    (project.proposals ?? []).forEach((proposal) => {
      if (proposal.createdAt) {
        events.push({
          id: `proposal-${proposal._id}-submitted`,
          actorName: nameOf(proposal.user),
          actionKey: "audit.proposal.submitted",
          entity: "proposal",
          entityLabel: project.title,
          at: proposal.createdAt,
          source: "remote",
        });
      }
      // Only *decided* proposals generate a second event, and they carry the
      // status-specific key so the feed reads "accepted" vs "rejected".
      if (proposal.status !== 1 && proposal.updatedAt) {
        events.push({
          id: `proposal-${proposal._id}-decided`,
          actorName: nameOf(project.owner),
          actionKey: `audit.proposal.status.${proposal.status}`,
          entity: "proposal",
          entityLabel: project.title,
          at: proposal.updatedAt,
          source: "remote",
        });
      }
    });
  });

  users.forEach((user) => {
    if (!user.createdAt) return;
    if (Number(user.status) === 2) {
      events.push({
        id: `user-${user._id}-verified`,
        actorName: nameOf(user),
        actionKey: "audit.user.verified",
        entity: "user",
        entityLabel: user.name || user.phoneNumber,
        at: user.updatedAt ?? user.createdAt,
        source: "remote",
      });
    } else if (Number(user.status) === 0 && user.updatedAt) {
      events.push({
        id: `user-${user._id}-rejected`,
        actorName: nameOf(user),
        actionKey: "audit.user.rejected",
        entity: "user",
        entityLabel: user.name || user.phoneNumber,
        at: user.updatedAt,
        source: "remote",
      });
    } else if (Number(user.status) === 1) {
      events.push({
        id: `user-${user._id}-pending`,
        actorName: nameOf(user),
        actionKey: "audit.user.pending",
        entity: "user",
        entityLabel: user.name || user.phoneNumber,
        at: user.createdAt,
        source: "remote",
      });
    }
  });

  return events;
}

/** Local half: what this browser did, and how it turned out. */
function localEvents(writes: LocalWrite[]): AuditEntry[] {
  return writes.map((write) => ({
    id: write.id,
    actorName: "—",
    actionKey: write.labelKey,
    entity: entityOf(write.resource),
    entityLabel:
      (typeof write.labelParams?.title === "string" ? write.labelParams.title : "") ||
      write.resource,
    at: write.createdAt,
    source: "local" as const,
    state: write.state,
    error: write.error,
  }));
}

/** `project:abc` → `project`, so the feed can group and filter by entity. */
function entityOf(resource: string): AuditEntry["entity"] {
  const head = resource.split(":")[0];
  if (head === "project" || head === "projects") return "project";
  if (head === "proposal") return "proposal";
  if (head === "user") return "user";
  return "system";
}

/**
 * Merges both sources into one feed, newest first, bounded by `limit`.
 *
 * Deterministic ids mean the same underlying event never appears twice, and
 * because both halves carry timestamps the local journal interleaves with
 * server history instead of sitting in a separate "your changes" ghetto.
 */
export function buildAuditFeed({
  projects = [],
  users = [],
  writes = [],
  limit = 100,
}: AuditFeedInput): AuditEntry[] {
  return [...remoteEvents(projects, users), ...localEvents(writes)]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

/** Counts by source — used by the audit page header. */
export function auditSourceCounts(entries: AuditEntry[]): { remote: number; local: number } {
  return entries.reduce(
    (counts, entry) => {
      counts[entry.source] += 1;
      return counts;
    },
    { remote: 0, local: 0 }
  );
}

export default buildAuditFeed;
