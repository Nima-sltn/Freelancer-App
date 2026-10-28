import { describe, expect, it } from "vitest";
import { buildLedger, ledgerTotals } from "./ledger";
import { PLATFORM_FEE_RATE } from "@/config/constants";
import type { Project, Proposal } from "@/types";

/**
 * Ledger derivation tests.
 *
 * The money view is derived, so the derivation *is* the source of truth: an
 * accepted bid must book exactly one escrow, one payout and one fee, and the
 * three must reconcile against the platform rate. If these numbers drift, the
 * wallet, the dashboards and the CSV export drift together — which is exactly
 * why they were moved behind one function.
 */

function proposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    _id: "pr1",
    description: "work",
    price: 10_000_000,
    duration: 10,
    status: 2,
    user: { _id: "u2", name: "Nima" },
    projectId: "p1",
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-05T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildLedger", () => {
  it("books escrow, payout and fee for an accepted proposal", () => {
    const entries = buildLedger({ role: "FREELANCER", proposals: [proposal()] });

    // Newest first: the payout and fee post when the bid is accepted (Jan 5),
    // the escrow opened when it was submitted (Jan 1).
    expect(entries.map((entry) => entry.kind)).toEqual(["payout", "fee", "escrow-in"]);
    const totals = ledgerTotals(entries);

    const price = 10_000_000;
    const fee = Math.round(price * PLATFORM_FEE_RATE);
    expect(totals.escrow).toBe(price);
    expect(totals.fees).toBe(fee);
    expect(totals.released).toBe(price - fee);
    // Escrow reconciles: what came in is what went out plus the fee.
    expect(totals.released + totals.fees).toBe(totals.escrow);
    expect(totals.pending).toBe(0);
  });

  it("keeps a pending bid in escrow until it is decided", () => {
    const entries = buildLedger({
      role: "OWNER",
      proposals: [proposal({ status: 1, project: { _id: "p1", title: "Landing page" } as Project })],
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("escrow-in");
    expect(entries[0].status).toBe("pending");
    expect(ledgerTotals(entries).pending).toBe(10_000_000);
  });

  it("drops rejected proposals — no money ever moved", () => {
    expect(buildLedger({ role: "OWNER", proposals: [proposal({ status: 0 })] })).toHaveLength(0);
  });

  it("scopes the counterparty by viewing role", () => {
    const asFreelancer = buildLedger({ role: "FREELANCER", proposals: [proposal()] });
    const asOwner = buildLedger({ role: "OWNER", proposals: [proposal()] });

    expect(asFreelancer[0].counterpartyRole).toBe("OWNER");
    expect(asOwner[0].counterpartyRole).toBe("FREELANCER");
  });

  it("ignores a bid on a project the viewer does not own", () => {
    const entries = buildLedger({
      role: "OWNER",
      proposals: [proposal({ status: 1, project: undefined })],
    });
    expect(entries).toHaveLength(0);
  });

  it("sorts newest first", () => {
    const entries = buildLedger({
      role: "FREELANCER",
      proposals: [
        proposal({ _id: "old", createdAt: "2025-11-01T10:00:00.000Z" }),
        proposal({ _id: "new", createdAt: "2026-02-01T10:00:00.000Z" }),
      ],
    });

    expect(entries[0].id).toBe("new-escrow");
  });
});
