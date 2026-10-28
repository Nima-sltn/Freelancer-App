import type { AuditEntry } from "@/types";

/**
 * Cross-domain impact projection.
 *
 * A single write in this product is never *just* one thing: accepting a bid
 * changes a proposal, moves money into escrow, nudges a trust score, unlocks XP
 * on the leaderboard, raises a notification and lands in the audit trail. Those
 * couplings used to exist only implicitly, spread across six modules — which is
 * precisely why the product read as six silos instead of one system.
 *
 * This module states the couplings **once, as data**, so that:
 *
 *  - the transaction inspector can show the user what their click touched;
 *  - the audit trail and notification centre can be explained rather than magic;
 *  - a test can assert that e.g. an accepted proposal really does reach the
 *    wallet and trust domains — the projection is the contract.
 */
export type DomainId =
  | "projects"
  | "proposals"
  | "users"
  | "wallet"
  | "trust"
  | "leaderboard"
  | "analytics"
  | "notifications"
  | "audit"
  | "sync";

export interface DomainImpact {
  domain: DomainId;
  /** i18n key of the human label, e.g. `impact.wallet`. */
  labelKey: string;
  tone: "primary" | "success" | "warning" | "neutral" | "info";
}

/** Every domain the product is composed of, in dependency order. */
export const DOMAINS: Array<{ domain: DomainId; labelKey: string }> = [
  { domain: "projects", labelKey: "impact.projects" },
  { domain: "proposals", labelKey: "impact.proposals" },
  { domain: "users", labelKey: "impact.users" },
  { domain: "wallet", labelKey: "impact.wallet" },
  { domain: "trust", labelKey: "impact.trust" },
  { domain: "leaderboard", labelKey: "impact.leaderboard" },
  { domain: "analytics", labelKey: "impact.analytics" },
  { domain: "notifications", labelKey: "impact.notifications" },
  { domain: "audit", labelKey: "impact.audit" },
  { domain: "sync", labelKey: "impact.sync" },
];

const LABEL = Object.fromEntries(DOMAINS.map((entry) => [entry.domain, entry.labelKey])) as Record<
  DomainId,
  string
>;

function impact(domain: DomainId, tone: DomainImpact["tone"] = "neutral"): DomainImpact {
  return { domain, labelKey: LABEL[domain], tone };
}

/** What a proposal write touches: the bidding domain itself, always. */
function proposalImpacts(labelKey: string): DomainImpact[] {
  const impacts: DomainImpact[] = [impact("proposals", "info")];

  // Accepting a bid is the marketplace's money event: escrow opens, the fee is
  // booked, the winner's XP and trust move, analytics rates change.
  const accepted =
    labelKey === "audit.proposal.status.2" || labelKey.startsWith("proposal.accepted");
  if (accepted) {
    impacts.push(
      impact("wallet", "success"),
      impact("trust", "primary"),
      impact("leaderboard", "primary"),
      impact("analytics", "info")
    );
  }
  if (labelKey === "audit.proposal.status.0" || labelKey.startsWith("proposal.rejected")) {
    impacts.push(impact("analytics", "warning"));
  }
  if (labelKey.startsWith("proposal.created") || labelKey === "audit.proposal.submitted") {
    impacts.push(impact("analytics", "info"));
  }
  return impacts;
}

/** What a project write touches: listings, dashboards and analytics. */
function projectImpacts(labelKey: string): DomainImpact[] {
  const impacts: DomainImpact[] = [impact("projects", "primary")];
  if (
    labelKey.startsWith("audit.project") ||
    labelKey === "projects.delete" ||
    labelKey.startsWith("status.project")
  ) {
    impacts.push(impact("analytics", "info"));
  }
  return impacts;
}

/** A moderation decision changes who is trusted, and how the queue looks. */
function userImpacts(labelKey: string): DomainImpact[] {
  const impacts: DomainImpact[] = [impact("users", "info")];
  if (labelKey === "audit.user.verified") {
    impacts.push(impact("trust", "success"), impact("analytics", "info"));
  }
  return impacts;
}

/**
 * Projects one journal write onto the domains it influences.
 *
 * Every write lands in the audit trail (it is the record of record) and raises
 * a notification (the user asked to be told), so those two are unconditional.
 * An in-flight or queued write additionally touches `sync` — the outbox that
 * owns it until the server confirms.
 */
export function describeImpact(write: {
  resource: string;
  labelKey: string;
  state?: string;
}): DomainImpact[] {
  const head = write.resource.split(":")[0];
  let specific: DomainImpact[] = [];

  if (head === "proposal") specific = proposalImpacts(write.labelKey);
  else if (head === "project" || head === "projects") specific = projectImpacts(write.labelKey);
  else if (head === "user") specific = userImpacts(write.labelKey);

  const impacts = [
    ...specific,
    impact("notifications", "info"),
    impact("audit", "neutral"),
  ];

  if (write.state === "pending" || write.state === "queued") {
    impacts.push(impact("sync", "warning"));
  }

  // De-duplicate by domain, keeping the most specific (first) tone.
  const seen = new Set<DomainId>();
  return impacts.filter((entry) => {
    if (seen.has(entry.domain)) return false;
    seen.add(entry.domain);
    return true;
  });
}

/** Domains touched by an audit entry, for the timeline row. */
export function impactsForAuditEntry(entry: AuditEntry): DomainImpact[] {
  return describeImpact({
    resource: `${entry.entity}:${entry.entityLabel}`,
    labelKey: entry.actionKey,
    state: entry.state,
  });
}

export default describeImpact;
