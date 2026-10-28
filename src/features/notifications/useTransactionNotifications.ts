import { useEffect, useRef } from "react";
import { APP_EVENTS, appEvents } from "@/lib/eventBus";
import { useNotifications } from "@/store/notifications";
import type { NotificationInput } from "@/store/notifications";
import { ROLE_PREFIX } from "@/config/navigation";
import type { JournalEntry } from "@/store/transaction";
import type { NotificationKind, UserRole } from "@/types";

/**
 * Transaction → notification bridge.
 *
 * The notification centre has two sources on purpose, and they answer different
 * questions:
 *
 *  - `useDerivedNotifications` watches **state** ("there is a new proposal on
 *    your project", "this deadline is close") and is idempotent by construction.
 *  - this hook watches **events** — the outcome of writes the user performed
 *    themselves, emitted by the ACID pipeline on commit, rollback or queue.
 *
 * Before this existed, a committed write was silent: the audit trail knew about
 * it, the journal knew about it, the wallet moved — but the one surface a user
 * actually watches never reacted. It is the smallest possible bridge (the event
 * bus already carried the payload, so no new import edge was needed between the
 * transaction store and the notification store).
 */
interface TransactionEventPayload {
  id: string;
  entry?: JournalEntry;
  result?: unknown;
  queued?: boolean;
  replayed?: boolean;
  error?: unknown;
  stale?: boolean;
  manual?: boolean;
  compensated?: boolean;
}

function kindOf(entry: JournalEntry): NotificationKind {
  const head = entry.resource.split(":")[0];
  if (head === "proposal") {
    if (entry.labelKey === "audit.proposal.status.2") return "proposal.accepted";
    if (entry.labelKey === "audit.proposal.status.0") return "proposal.rejected";
    return "proposal.created";
  }
  if (head === "project" || head === "projects") {
    return entry.labelKey === "status.project.closed" ? "project.closed" : "project.created";
  }
  if (head === "user") {
    return entry.labelKey === "audit.user.verified" ? "user.verified" : "system";
  }
  return "system";
}

function hrefOf(entry: JournalEntry, role: UserRole | undefined): string | undefined {
  const [, id] = entry.resource.split(":");
  if (!id || !role) return undefined;
  const prefix = ROLE_PREFIX[role];
  const head = entry.resource.split(":")[0];
  if (head === "project" && id !== "projects") return `${prefix}/projects/${id}`;
  if (head === "proposal") return `${prefix}/proposals`;
  if (head === "user") return role === "ADMIN" ? "/admin/users" : undefined;
  return undefined;
}

export function useTransactionNotifications(user: { role?: UserRole } | undefined) {
  const { merge } = useNotifications();
  const role = user?.role;

  // The bus is process-scoped, the merge function is not: keep the latest one
  // in a ref so the effect subscribes exactly once per mount.
  const mergeRef = useRef(merge);
  mergeRef.current = merge;
  const roleRef = useRef(role);
  roleRef.current = role;

  useEffect(() => {
    const notify = (input: NotificationInput) => mergeRef.current([input]);

    const offCommit = appEvents.on(APP_EVENTS.transactionCommitted, (raw) => {
      const payload = raw as TransactionEventPayload;
      if (!payload?.entry) return;
      const entry = payload.entry;
      notify({
        id: `tx-${entry.id}${payload.queued ? "-queued" : "-committed"}`,
        kind: kindOf(entry),
        titleKey: entry.labelKey,
        params: entry.labelParams,
        href: hrefOf(entry, roleRef.current),
        severity: payload.queued ? "warning" : "success",
        createdAt: entry.updatedAt,
      });
    });

    const offRollback = appEvents.on(APP_EVENTS.transactionRolledBack, (raw) => {
      const payload = raw as TransactionEventPayload;
      if (!payload?.entry) return;
      const entry = payload.entry;
      notify({
        id: `tx-${entry.id}-rolled-back`,
        kind: "system",
        titleKey: entry.labelKey,
        params: entry.labelParams,
        href: payload.stale ? hrefOf(entry, roleRef.current) : undefined,
        severity: "danger",
        createdAt: entry.updatedAt,
      });
    });

    const offQueueDrained = appEvents.on(APP_EVENTS.queueDrained, (raw) => {
      const payload = raw as { synced?: number } | undefined;
      notify({
        id: `tx-drained-${Date.now()}`,
        kind: "system",
        titleKey: "offline.synced",
        params: { count: payload?.synced ?? 0 },
        severity: "success",
      });
    });

    return () => {
      offCommit();
      offRollback();
      offQueueDrained();
    };
  }, []);
}

export default useTransactionNotifications;
