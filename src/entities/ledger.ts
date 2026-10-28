import { PLATFORM_FEE_RATE } from "@/config/constants";
import { formatMonthKey, formatMonthLabel } from "@/lib/format/dates";
import { netPayout } from "./proposal/matching";
import type { LedgerEntry, Proposal, SeriesPoint, UserRole } from "@/types";

/**
 * The ledger, derived as a pure function.
 *
 * The API has no payments endpoint, so the money view is *reconstructed* from
 * the proposal pipeline: every accepted bid books an escrow deposit, a payout
 * and the platform fee, and every pending bid books an in-flight escrow. The
 * derivation lives in `entities/` (not in the wallet feature) because it is
 * domain logic — the same numbers feed the wallet page, the dashboards, the CSV
 * export and the impact projection, and none of them may disagree.
 *
 * It is deliberately labelled "derived" in the UI: this is what a payment
 * provider integration would replace, expressed as one function with one input,
 * so swapping the source is a one-line change instead of a rewrite.
 */
export interface LedgerInput {
  /** Viewing role decides who the counterparty is. */
  role: UserRole | undefined;
  proposals: Proposal[];
}

export function buildLedger({ role, proposals }: LedgerInput): LedgerEntry[] {
  const isFreelancer = role === "FREELANCER";
  // Freelancers already receive only their own proposals; owners and admins
  // receive everything, so the owner view keeps only decided or own-project bids.
  const relevant = isFreelancer
    ? proposals
    : proposals.filter((proposal) => proposal.status !== 1 || proposal.project);

  const counterpartyRole: UserRole = isFreelancer ? "OWNER" : "FREELANCER";

  return relevant
    .filter((proposal) => proposal.status === 2 || proposal.status === 1)
    .flatMap<LedgerEntry>((proposal) => {
      const accepted = proposal.status === 2;
      const { fee, net } = netPayout(proposal.price);
      const base: LedgerEntry = {
        id: `${proposal._id}-escrow`,
        kind: "escrow-in",
        status: accepted ? "settled" : "pending",
        amount: proposal.price,
        fee: accepted ? fee : undefined,
        projectId: proposal.projectId,
        projectTitle: proposal.project?.title,
        counterpartyRole,
        createdAt: proposal.createdAt ?? new Date().toISOString(),
      };
      if (!accepted) return [base];
      return [
        base,
        {
          id: `${proposal._id}-payout`,
          kind: "payout",
          status: "settled",
          amount: net,
          projectId: proposal.projectId,
          projectTitle: proposal.project?.title,
          counterpartyRole,
          createdAt: proposal.updatedAt ?? proposal.createdAt ?? new Date().toISOString(),
        },
        {
          id: `${proposal._id}-fee`,
          kind: "fee",
          status: "settled",
          amount: fee,
          counterpartyRole: "ADMIN",
          createdAt: proposal.updatedAt ?? proposal.createdAt ?? new Date().toISOString(),
        },
      ];
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Six-month payout series for the wallet chart (oldest bucket first). */
export function ledgerSeries(entries: LedgerEntry[]): SeriesPoint[] {
  const buckets = new Map<string, SeriesPoint>();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - index, 1);
    buckets.set(formatMonthKey(date), { label: formatMonthLabel(date), value: 0 });
  }

  entries
    .filter((entry) => entry.kind === "payout")
    .forEach((entry) => {
      const key = formatMonthKey(new Date(entry.createdAt));
      const bucket = buckets.get(key);
      if (bucket) bucket.value += entry.amount;
    });

  return [...buckets.values()];
}

export interface LedgerTotals {
  escrow: number;
  released: number;
  fees: number;
  pending: number;
}

/** Aggregate totals for the wallet stat cards. */
export function ledgerTotals(entries: LedgerEntry[]): LedgerTotals {
  const sum = (kind: LedgerEntry["kind"]) =>
    entries.filter((entry) => entry.kind === kind).reduce((total, entry) => total + entry.amount, 0);

  return {
    escrow: sum("escrow-in"),
    released: sum("payout"),
    fees: sum("fee"),
    pending: entries
      .filter((entry) => entry.status === "pending")
      .reduce((total, entry) => total + entry.amount, 0),
  };
}

export { PLATFORM_FEE_RATE };
export default buildLedger;
