import { describe, expect, it } from "vitest";
import { XP_RULES } from "@/config/constants";
import { buildProposal, buildUser, daysFromNow } from "@/test/factories";
import { buildLeaderboard, buildTrustProfile, computeExperience } from "./trust";

const veteran = buildUser({
  _id: "vet-1",
  role: "FREELANCER",
  status: 2,
  isActive: true,
  rating: 4.9,
  reviewsCount: 30,
  completedProjects: 40,
  responseHours: 2,
  createdAt: daysFromNow(-900),
});

const newcomer = buildUser({
  _id: "new-1",
  role: "FREELANCER",
  status: 1,
  isActive: false,
  rating: 0,
  reviewsCount: 0,
  completedProjects: 0,
  responseHours: 72,
  createdAt: daysFromNow(-1),
});

describe("buildTrustProfile", () => {
  it("awards every signal for a veteran account and reaches platinum", () => {
    const trust = buildTrustProfile(veteran);
    expect(trust.signals.every((signal) => signal.passed)).toBe(true);
    expect(trust.score).toBe(100);
    expect(trust.level).toBe("platinum");
    expect(trust.signals.reduce((sum, signal) => sum + signal.weight, 0)).toBe(100);
  });

  it("awards nothing for an unverified newcomer", () => {
    const trust = buildTrustProfile(newcomer);
    expect(trust.score).toBe(0);
    expect(trust.level).toBe("bronze");
    expect(trust.signals.filter((signal) => signal.passed)).toHaveLength(0);
  });

  it("buckets intermediate scores into the documented bands", () => {
    const silver = buildTrustProfile({
      ...newcomer,
      status: 2,
      isActive: true,
      completedProjects: 5,
    });
    expect(silver.score).toBe(50);
    expect(silver.level).toBe("silver");

    const gold = buildTrustProfile({ ...veteran, responseHours: 48, createdAt: daysFromNow(-10) });
    expect(gold.score).toBe(70);
    expect(gold.level).toBe("gold");
  });

  it("labels every signal for translation", () => {
    expect(buildTrustProfile(veteran).signals.every((s) => s.labelKey.startsWith("trust.signal."))).toBe(
      true
    );
  });
});

describe("computeExperience", () => {
  it("derives XP from observable behaviour only", () => {
    const proposals = [
      buildProposal({ _id: "pr1", user: { _id: "new-1", name: "x" }, status: 1 }),
      buildProposal({ _id: "pr2", user: { _id: "new-1", name: "x" }, status: 2 }),
      buildProposal({ _id: "pr3", user: { _id: "other", name: "y" }, status: 2 }),
    ];
    const experience = computeExperience(newcomer, proposals);
    // Two bids, one accepted. The newcomer is unverified with no reviews and no
    // completed projects, so only those two rules contribute.
    const expectedXp = 2 * XP_RULES.perProposal + XP_RULES.perAcceptedProposal;
    expect(experience.xp).toBe(expectedXp);
    expect(experience.level).toBe(1);
    expect(experience.xpToNextLevel).toBe(120 - expectedXp);
    expect(experience.levelProgress).toBeCloseTo(expectedXp / 120);
  });

  it("levels up as XP crosses each threshold", () => {
    const low = computeExperience(veteran, []);
    expect(low.level).toBeGreaterThan(5);
    expect(low.levelProgress).toBeGreaterThanOrEqual(0);
    expect(low.levelProgress).toBeLessThan(1);
  });

  it("unlocks badges from behaviour", () => {
    const experience = computeExperience(veteran, [
      buildProposal({ status: 2, user: { _id: "vet-1", name: "v" } }),
    ]);
    expect(experience.badges).toEqual(
      expect.arrayContaining(["verified", "highRating", "veteran", "accepted"])
    );
    expect(computeExperience(newcomer, []).badges).toEqual([]);
  });
});

describe("buildLeaderboard", () => {
  const proposals = [
    buildProposal({ _id: "pr1", user: { _id: "vet-1", name: "v" }, status: 2 }),
    buildProposal({ _id: "pr2", user: { _id: "vet-1", name: "v" }, status: 2 }),
    buildProposal({ _id: "pr3", user: { _id: "new-1", name: "n" }, status: 1 }),
  ];

  it("ranks active freelancers by XP", () => {
    const rows = buildLeaderboard([veteran, newcomer, buildUser({ role: "OWNER" })], proposals);
    expect(rows.map((row) => row.user._id)).toEqual(["vet-1"]);
    expect(rows[0].accepted).toBe(2);
    expect(rows[0].winRate).toBe(1);
  });

  it("includes an active newcomer with a zero win rate", () => {
    const active = { ...newcomer, status: 2 as const, isActive: true };
    const rows = buildLeaderboard([veteran, active], proposals);
    expect(rows).toHaveLength(2);
    expect(rows[1].user._id).toBe("new-1");
    expect(rows[1].winRate).toBe(0);
  });

  it("honours the limit", () => {
    expect(buildLeaderboard([veteran, newcomer], proposals, 1)).toHaveLength(1);
  });
});
