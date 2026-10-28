import { describe, expect, it } from "vitest";
import { buildProposal, buildProject, daysFromNow } from "@/test/factories";
import {
  buildFreelancerPortfolio,
  buildOwnerPortfolio,
  dedupeById,
  filterProjects,
  paginate,
  projectUrgency,
  sortProjects,
} from "./metrics";

const webProject = buildProject({ _id: "p1" });
const mobileProject = buildProject({
  _id: "p2",
  title: "اپلیکیشن موبایل فروشگاهی",
  description: "ساخت اپلیکیشن اندروید و iOS برای فروشگاه.",
  tags: ["React Native"],
  budget: 120_000_000,
  status: "CLOSED",
  category: { _id: "cat-2", title: "توسعه موبایل", englishTitle: "Mobile" },
  createdAt: daysFromNow(-30),
  deadline: daysFromNow(2),
});
const closedProject = buildProject({
  _id: "p3",
  title: "طراحی هویت بصری",
  description: "طراحی لوگو و راهنمای برند.",
  tags: ["Branding"],
  budget: 8_000_000,
  status: "CLOSED",
  category: { _id: "cat-3", title: "برندینگ", englishTitle: "Branding" },
  freelancer: { _id: "user-9", name: "پویا" },
  proposals: [buildProposal()],
  createdAt: daysFromNow(-60),
});

const all = [webProject, mobileProject, closedProject];

describe("filterProjects", () => {
  it("returns everything without filters", () => {
    expect(filterProjects(all, {})).toHaveLength(3);
  });

  it("filters by status and ignores the sentinel ALL", () => {
    expect(filterProjects(all, { status: "OPEN" }).map((p) => p._id)).toEqual(["p1"]);
    expect(filterProjects(all, { status: "ALL" })).toHaveLength(3);
  });

  it("filters by one or several categories", () => {
    expect(filterProjects(all, { category: "Mobile" }).map((p) => p._id)).toEqual(["p2"]);
    expect(filterProjects(all, { category: "Mobile,Branding" }).map((p) => p._id)).toEqual([
      "p2",
      "p3",
    ]);
    expect(filterProjects(all, { category: "ALL" })).toHaveLength(3);
  });

  it("filters by budget bounds", () => {
    expect(filterProjects(all, { minBudget: 10_000_000 }).map((p) => p._id)).toEqual([
      "p1",
      "p2",
    ]);
    expect(filterProjects(all, { maxBudget: 10_000_000 }).map((p) => p._id)).toEqual(["p3"]);
  });

  it("searches title, description and tags through the Persian normaliser", () => {
    expect(filterProjects(all, { search: "فروشگاه" }).map((p) => p._id)).toEqual(["p1", "p2"]);
    expect(filterProjects(all, { search: "branding" }).map((p) => p._id)).toEqual(["p3"]);
    expect(filterProjects(all, { search: "نمی‌یابد" })).toHaveLength(0);
  });
});

describe("sortProjects", () => {
  it("sorts by creation date by default and explicitly", () => {
    expect(sortProjects(all).map((p) => p._id)).toEqual(["p1", "p2", "p3"]);
    expect(sortProjects(all, "latest").map((p) => p._id)).toEqual(["p1", "p2", "p3"]);
    expect(sortProjects(all, "earliest").map((p) => p._id)).toEqual(["p3", "p2", "p1"]);
  });

  it("sorts by budget and by proposal volume", () => {
    expect(sortProjects(all, "budgetHigh").map((p) => p._id)).toEqual(["p2", "p1", "p3"]);
    expect(sortProjects(all, "budgetLow").map((p) => p._id)).toEqual(["p3", "p1", "p2"]);
    expect(sortProjects(all, "proposals")[0]._id).toBe("p3");
  });

  it("never mutates the input array", () => {
    const before = all.map((p) => p._id);
    sortProjects(all, "budgetLow");
    expect(all.map((p) => p._id)).toEqual(before);
  });
});

describe("paginate", () => {
  it("slices a page and reports the total", () => {
    const page = paginate(all, 2, 2);
    expect(page.items.map((p) => p._id)).toEqual(["p3"]);
    expect(page).toMatchObject({ page: 2, pageSize: 2, total: 3 });
  });

  it("clamps an out-of-range page to the first one", () => {
    expect(paginate(all, 0, 2).page).toBe(1);
  });
});

describe("projectUrgency", () => {
  it("labels overdue and imminent projects", () => {
    expect(projectUrgency(mobileProject).isUrgent).toBe(true);
    expect(projectUrgency(mobileProject).label).toBe("projects.deadlineSoon");
    expect(projectUrgency(buildProject({ deadline: daysFromNow(-4) })).label).toBe(
      "projects.overdue"
    );
  });
});

describe("buildOwnerPortfolio", () => {
  it("aggregates the portfolio", () => {
    const stats = buildOwnerPortfolio(all);
    expect(stats).toMatchObject({
      total: 3,
      open: 1,
      closed: 2,
      awarded: 1,
      proposalsReceived: 1,
    });
    expect(stats.totalBudget).toBe(40_000_000 + 120_000_000 + 8_000_000);
    expect(stats.committedBudget).toBe(8_000_000);
    expect(stats.averageProposals).toBeCloseTo(1 / 3);
    expect(stats.budgetByCategory[0]).toEqual({ label: "توسعه موبایل", value: 120_000_000 });
    expect(stats.budgetByCategory).toHaveLength(3);
  });

  it("handles an empty portfolio without dividing by zero", () => {
    expect(buildOwnerPortfolio([])).toMatchObject({
      total: 0,
      averageProposals: 0,
      urgent: 0,
      budgetByCategory: [],
    });
  });
});

describe("buildFreelancerPortfolio", () => {
  const proposals = [
    buildProposal({ _id: "pr1", price: 10_000_000, status: 1 }),
    buildProposal({ _id: "pr2", price: 20_000_000, status: 2 }),
    buildProposal({ _id: "pr3", price: 30_000_000, status: 0 }),
    buildProposal({ _id: "pr4", price: 40_000_000, status: 2 }),
  ];

  it("aggregates the pipeline and the win rate", () => {
    const stats = buildFreelancerPortfolio(proposals);
    expect(stats).toMatchObject({
      proposals: 4,
      pending: 1,
      accepted: 2,
      rejected: 1,
      totalBid: 100_000_000,
      wonValue: 60_000_000,
      averageBid: 25_000_000,
    });
    expect(stats.winRate).toBeCloseTo(2 / 3);
    expect(stats.pipeline).toHaveLength(3);
  });

  it("treats undecided bids as a zero win rate instead of NaN", () => {
    const stats = buildFreelancerPortfolio([buildProposal({ status: 1 })]);
    expect(stats.winRate).toBe(0);
  });
});

describe("dedupeById", () => {
  it("keeps the first occurrence of every id", () => {
    const result = dedupeById([{ _id: "a" }, { _id: "a" }, { _id: "b" }]);
    expect(result.map((item) => item._id)).toEqual(["a", "b"]);
  });
});
