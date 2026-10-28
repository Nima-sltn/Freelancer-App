import { describe, expect, it } from "vitest";
import { PLATFORM_FEE_RATE } from "@/config/constants";
import { buildCategory, buildProject, buildProposal, buildUser, daysFromNow } from "@/test/factories";
import { buildAnalyticsSnapshot, buildInsights, snapshotToRows } from "./overview";

const now = new Date(2024, 5, 15, 12);

const projects = [
  buildProject({ _id: "p1", budget: 40_000_000, status: "OPEN", createdAt: "2024-05-10T10:00:00Z" }),
  buildProject({
    _id: "p2",
    budget: 12_000_000,
    status: "OPEN",
    deadline: daysFromNow(3),
    category: { _id: "cat-2", title: "توسعه موبایل", englishTitle: "Mobile" },
    createdAt: "2024-06-02T10:00:00Z",
  }),
  buildProject({
    _id: "p3",
    budget: 3_000_000,
    status: "CLOSED",
    category: { _id: "cat-2", title: "توسعه موبایل", englishTitle: "Mobile" },
    createdAt: "2024-04-01T10:00:00Z",
  }),
];

const proposals = [
  buildProposal({ _id: "pr1", price: 30_000_000, status: 2, duration: 20, createdAt: "2024-06-01T10:00:00Z" }),
  buildProposal({ _id: "pr2", price: 20_000_000, status: 1, duration: 40 }),
  buildProposal({ _id: "pr3", price: 10_000_000, status: 0 }),
];

const users = [
  buildUser({ _id: "u1", status: 2 }),
  buildUser({ _id: "u2", status: 1, role: "FREELANCER" }),
];

describe("buildAnalyticsSnapshot", () => {
  const snapshot = buildAnalyticsSnapshot({
    projects,
    proposals,
    users,
    categories: [buildCategory(), buildCategory({ _id: "cat-2", title: "توسعه موبایل" })],
    now,
  });

  it("counts totals across the domains", () => {
    expect(snapshot.totals).toEqual({
      projects: 3,
      openProjects: 2,
      proposals: 3,
      acceptedProposals: 1,
      users: 2,
      pendingUsers: 1,
    });
  });

  it("computes escrow, released and averages from the same source of truth", () => {
    expect(snapshot.money.averageBudget).toBe(Math.round((40 + 12 + 3) * 1_000_000 / 3));
    expect(snapshot.money.averageProposal).toBe(20_000_000);
    expect(snapshot.money.escrow).toBe(Math.round(30_000_000 + 20_000_000 * 0.35));
    expect(snapshot.money.released).toBe(Math.round(30_000_000 * (1 - PLATFORM_FEE_RATE)));
  });

  it("derives rates that stay in range", () => {
    expect(snapshot.rates.acceptanceRate).toBeCloseTo(0.5);
    expect(snapshot.rates.averageProposalsPerProject).toBeCloseTo(1);
    expect(snapshot.rates.averageDeliveryDays).toBe(20);
  });

  it("builds a fixed-width timeline ending at the current month", () => {
    expect(snapshot.timeline).toHaveLength(8);
    const last = snapshot.timeline.at(-1);
    expect(last?.value).toBe(1);
    expect(last?.secondary).toBe(1);
    expect(snapshot.timeline.every((point) => typeof point.label === "string")).toBe(true);
  });

  it("orders the category mix by project count", () => {
    expect(snapshot.categoryDistribution).toEqual([
      { label: "طراحی وب", value: 1 },
      { label: "توسعه موبایل", value: 2 },
    ].sort((a, b) => b.value - a.value));
  });

  it("keeps zero-valued status slices out of the chart", () => {
    expect(snapshot.statusDistribution.every((slice) => slice.value > 0)).toBe(true);
  });

  it("buckets budgets into the five documented ranges", () => {
    expect(snapshot.budgetBuckets).toHaveLength(5);
    expect(snapshot.budgetBuckets.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(3);
  });

  it("is deterministic for the same inputs", () => {
    const again = buildAnalyticsSnapshot({ projects, proposals, users, now });
    expect(again).toEqual(snapshot);
  });

  it("survives empty input", () => {
    const empty = buildAnalyticsSnapshot({ projects: [], proposals: [], now });
    expect(empty.totals.projects).toBe(0);
    expect(empty.rates.acceptanceRate).toBe(0);
    expect(empty.money.escrow).toBe(0);
  });
});

describe("buildInsights", () => {
  it("emits translation-ready highlights", () => {
    const snapshot = buildAnalyticsSnapshot({ projects, proposals, users, now });
    const insights = buildInsights(
      snapshot,
      projects,
      [buildCategory({ averageBudget: 50_000_000 })],
    );
    expect(insights.length).toBeGreaterThanOrEqual(3);
    expect(insights.every((insight) => insight.key.startsWith("analytics.insight"))).toBe(true);
    expect(insights[0].params.rate).toMatch(/%|٪/);
  });
});

describe("snapshotToRows", () => {
  it("flattens the snapshot into exportable rows", () => {
    const snapshot = buildAnalyticsSnapshot({ projects, proposals, now });
    const rows = snapshotToRows(snapshot);
    expect(rows.length).toBeGreaterThan(20);
    expect(rows[0]).toHaveProperty("metric");
    expect(rows.every((row) => typeof row.value === "number")).toBe(true);
    expect(rows.some((row) => String(row.metric).startsWith("totals."))).toBe(true);
  });
});
