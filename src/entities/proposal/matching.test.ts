import { describe, expect, it } from "vitest";
import { buildProject, buildProposal, buildUser, daysFromNow } from "@/test/factories";
import {
  assessProposalRisk,
  computeMatchScore,
  netPayout,
  rankProjectsForUser,
  simulateProposal,
} from "./matching";

// `categories` is part of the match context, not of the API `User` payload.
const strongUser = {
  ...buildUser({
    _id: "user-3",
    role: "FREELANCER",
    skills: ["React", "Tailwind"],
    hourlyRate: 0,
    rating: 5,
    completedProjects: 30,
  }),
  categories: ["Web Design"],
};

const weakUser = {
  ...buildUser({
    _id: "user-4",
    role: "FREELANCER",
    skills: ["Cooking"],
    hourlyRate: 0,
    rating: 2,
    completedProjects: 0,
  }),
  categories: [] as string[],
};

const project = buildProject({
  tags: ["React", "Tailwind"],
  budget: 40_000_000,
  deadline: daysFromNow(60),
});

describe("computeMatchScore", () => {
  it("exposes every weighted factor with an i18n key", () => {
    const score = computeMatchScore(project, { user: strongUser, competitorCount: 0 });
    expect(score.factors.map((factor) => factor.key)).toEqual([
      "skills",
      "category",
      "budget",
      "deadline",
      "competition",
      "reputation",
    ]);
    expect(score.factors.every((factor) => factor.labelKey.startsWith("matching.factor."))).toBe(
      true
    );
    const totalWeight = score.factors.reduce((sum, factor) => sum + factor.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
  });

  it("produces an explainable score inside the 0–100 band", () => {
    const score = computeMatchScore(project, { user: strongUser, competitorCount: 0 });
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.factors.find((factor) => factor.key === "skills")?.value).toBe(100);
    expect(score.factors.find((factor) => factor.key === "category")?.value).toBe(95);
    expect(score.score).toBe(93);
    expect(score.tier).toBe("excellent");
  });

  it("ranks a well-matched freelancer above a poorly matched one", () => {
    const strong = computeMatchScore(project, { user: strongUser, competitorCount: 0 });
    const weak = computeMatchScore(project, { user: weakUser, competitorCount: 20 });
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(weak.factors.find((factor) => factor.key === "competition")?.value).toBe(10);
  });

  it("keeps the tier aligned with the documented score bands", () => {
    const bandFor = (score: number) =>
      score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "weak";

    const profiles = [strongUser, weakUser, { ...strongUser, rating: 3, completedProjects: 2 }];
    profiles.forEach((user) => {
      const computed = computeMatchScore(
        buildProject({ tags: ["React"], deadline: daysFromNow(45) }),
        { user }
      );
      expect(computed.tier).toBe(bandFor(computed.score));
    });
  });
});

describe("rankProjectsForUser", () => {
  it("only ranks open projects, best first, and respects the limit", () => {
    const projects = [
      buildProject({ _id: "p1", tags: ["React", "Tailwind"], deadline: daysFromNow(60) }),
      buildProject({ _id: "p2", tags: ["Cooking"], deadline: daysFromNow(3) }),
      buildProject({ _id: "p3", status: "CLOSED", tags: ["React"] }),
    ];
    const ranked = rankProjectsForUser(projects, { user: strongUser }, 1);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].project._id).toBe("p1");
  });
});

describe("assessProposalRisk", () => {
  it("flags a price far above the category norm as high risk", () => {
    const risk = assessProposalRisk(buildProposal({ price: 30_000_000 }), {
      categoryAverageBudget: 10_000_000,
    });
    expect(risk.level).toBe("high");
    expect(risk.score).toBe(45);
    expect(risk.flags[0]).toMatchObject({ key: "priceAnomaly", severity: "high" });
  });

  it("flags suspicious durations relative to the money", () => {
    const risk = assessProposalRisk(buildProposal({ price: 30_000_000, duration: 10 }), {
      categoryAverageBudget: 10_000_000,
    });
    expect(risk.flags.map((flag) => flag.key)).toContain("durationAnomaly");
  });

  it("flags brand-new low-rated accounts", () => {
    const risk = assessProposalRisk(buildProposal(), {
      categoryAverageBudget: 40_000_000,
      author: { ...buildUser(), createdAt: daysFromNow(-2), completedProjects: 0, rating: 3 },
    });
    expect(risk.flags.map((flag) => flag.key)).toEqual(["newAccount", "lowRating"]);
    expect(risk.level).toBe("medium");
  });

  it("reports a clean proposal as low risk", () => {
    const risk = assessProposalRisk(buildProposal({ price: 20_000_000, duration: 30 }), {
      categoryAverageBudget: 40_000_000,
      author: { ...buildUser(), createdAt: daysFromNow(-200), rating: 4.8 },
    });
    expect(risk).toEqual({ score: 0, level: "low", flags: [] });
  });
});

describe("simulateProposal", () => {
  it("rewards a bid close to the budget with a matching duration", () => {
    const result = simulateProposal({
      budget: 40_000_000,
      price: 32_000_000,
      duration: 30,
      expectedDuration: 30,
      competitorCount: 3,
    });
    expect(result.probability).toBe(0.82);
    expect(result.verdict).toBe("strong");
    expect(result.suggestedMin).toBeLessThan(result.suggestedMax);
    expect(result.breakdown.map((item) => item.key)).toEqual(["price", "duration", "competition"]);
  });

  it("penalises an over-priced, slow bid", () => {
    const result = simulateProposal({
      budget: 10_000_000,
      price: 60_000_000,
      duration: 200,
      expectedDuration: 30,
      competitorCount: 12,
    });
    expect(result.verdict).toBe("weak");
    expect(result.probability).toBe(0.04);
  });

  it("always returns a probability inside the contractual bounds", () => {
    const result = simulateProposal({ budget: 0, price: 0, duration: 0 });
    expect(result.probability).toBeGreaterThanOrEqual(0.04);
    expect(result.probability).toBeLessThanOrEqual(0.96);
  });
});

describe("netPayout", () => {
  it("deducts the platform fee", () => {
    expect(netPayout(10_000_000)).toEqual({ fee: 700_000, net: 9_300_000 });
    expect(netPayout(0)).toEqual({ fee: 0, net: 0 });
  });
});
