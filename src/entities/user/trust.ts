import { XP_RULES } from "@/config/constants";
import type { Proposal, TrustProfile, User } from "@/types";

/**
 * Trust and reputation model.
 *
 * Trust is the currency of a two-sided marketplace: clients need a fast signal
 * before paying a stranger, and freelancers need a reason to keep their profile
 * accurate. Both the trust score and the experience/level system are derived
 * from observable behaviour (verification, delivery history, ratings, response
 * time) rather than from a mutable counter, so they cannot drift out of sync.
 */

export interface TrustSignal {
  key: string;
  labelKey: string;
  weight: number;
  passed: boolean;
}

const TRUST_BANDS: Array<{ min: number; level: TrustProfile["level"] }> = [
  { min: 85, level: "platinum" },
  { min: 65, level: "gold" },
  { min: 40, level: "silver" },
  { min: 0, level: "bronze" },
];

export function buildTrustProfile(
  user: Pick<
    User,
    "status" | "isActive" | "rating" | "reviewsCount" | "completedProjects" | "responseHours" | "createdAt"
  >
): TrustProfile {
  const completed = user.completedProjects ?? 0;
  const rating = user.rating ?? 0;
  const reviews = user.reviewsCount ?? 0;
  const responseHours = user.responseHours ?? 48;
  const accountAgeDays = user.createdAt
    ? (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000
    : 0;

  const signals: TrustSignal[] = [
    {
      key: "verified",
      labelKey: "trust.signal.verified",
      weight: 25,
      passed: Number(user.status) === 2 && user.isActive,
    },
    {
      key: "completedProjects",
      labelKey: "trust.signal.completedProjects",
      weight: 25,
      passed: completed >= 5,
    },
    {
      key: "rating",
      labelKey: "trust.signal.rating",
      weight: 20,
      passed: rating >= 4.2 && reviews >= 3,
    },
    {
      key: "responseTime",
      labelKey: "trust.signal.responseTime",
      weight: 15,
      passed: responseHours <= 12,
    },
    {
      key: "history",
      labelKey: "trust.signal.history",
      weight: 15,
      passed: accountAgeDays >= 60,
    },
  ];

  const score = signals.reduce((sum, signal) => sum + (signal.passed ? signal.weight : 0), 0);
  const level = TRUST_BANDS.find((band) => score >= band.min)?.level ?? "bronze";

  return { score, level, signals };
}

/* -------------------------------------------------------------------------- */
/* Experience & badges                                                        */
/* -------------------------------------------------------------------------- */

export interface ExperienceProfile {
  xp: number;
  level: number;
  /** 0–1 progress inside the current level. */
  levelProgress: number;
  xpToNextLevel: number;
  badges: string[];
}

const XP_PER_LEVEL_BASE = 120;

/** XP grows linearly with level so early levels feel achievable. */
function levelFor(xp: number): { level: number; floor: number; ceiling: number } {
  let level = 1;
  let floor = 0;
  let ceiling = XP_PER_LEVEL_BASE;
  while (xp >= ceiling) {
    level += 1;
    floor = ceiling;
    ceiling += XP_PER_LEVEL_BASE + (level - 1) * 60;
  }
  return { level, floor, ceiling };
}

export function computeExperience(user: User, proposals: Proposal[]): ExperienceProfile {
  const mine = proposals.filter(
    (proposal) => (proposal.user as { _id?: string })?._id === user._id
  );
  const accepted = mine.filter((proposal) => proposal.status === 2);

  const xp =
    mine.length * XP_RULES.perProposal +
    accepted.length * XP_RULES.perAcceptedProposal +
    (user.completedProjects ?? 0) * XP_RULES.perCompletedProject +
    (Number(user.status) === 2 ? XP_RULES.perVerifiedProfile : 0) +
    (user.reviewsCount ?? 0) * XP_RULES.perReview;

  const { level, floor, ceiling } = levelFor(xp);

  const badges: string[] = [];
  if (mine.length >= 1) badges.push("firstProposal");
  if (mine.length >= 10) badges.push("tenProposals");
  if (accepted.length >= 1) badges.push("accepted");
  if (Number(user.status) === 2) badges.push("verified");
  if ((user.rating ?? 0) >= 4.5) badges.push("highRating");
  if ((user.completedProjects ?? 0) >= 20) badges.push("veteran");

  return {
    xp,
    level,
    levelProgress: (xp - floor) / Math.max(1, ceiling - floor),
    xpToNextLevel: Math.max(0, ceiling - xp),
    badges,
  };
}

/* -------------------------------------------------------------------------- */
/* Leaderboard                                                                */
/* -------------------------------------------------------------------------- */

export interface LeaderboardRow {
  user: User;
  xp: number;
  level: number;
  accepted: number;
  winRate: number;
  trust: TrustProfile;
}

export function buildLeaderboard(
  users: User[],
  proposals: Proposal[],
  limit = 10
): LeaderboardRow[] {
  return users
    .filter((user) => user.role === "FREELANCER" && user.isActive)
    .map((user) => {
      const mine = proposals.filter(
        (proposal) => (proposal.user as { _id?: string })?._id === user._id
      );
      const accepted = mine.filter((proposal) => proposal.status === 2).length;
      const experience = computeExperience(user, proposals);
      return {
        user,
        xp: experience.xp,
        level: experience.level,
        accepted,
        winRate: mine.length > 0 ? accepted / mine.length : 0,
        trust: buildTrustProfile(user),
      };
    })
    .sort((a, b) => b.xp - a.xp || b.trust.score - a.trust.score)
    .slice(0, limit);
}
