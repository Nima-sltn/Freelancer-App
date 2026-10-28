import { PLATFORM_FEE_RATE } from "@/config/constants";
import { normalizeSearch } from "@/lib/format/text";
import type { MatchScore, Project, Proposal, RiskAssessment, User } from "@/types";

/**
 * Recommendation and risk engine (client-side, deterministic).
 *
 * ## Why this exists
 * A job board without ranking forces freelancers to read every posting and
 * forces clients to read every bid. This module produces an **explainable**
 * score: every factor exposes its own 0–100 value and weight, so the UI can show
 * *why* a project is a good fit instead of an opaque number. All five factors are
 * computed from data already on the client, so it works identically in live and
 * demo mode, and it is fully unit-testable.
 */

const WEIGHTS = {
  skills: 0.3,
  category: 0.15,
  budget: 0.2,
  deadline: 0.15,
  competition: 0.1,
  reputation: 0.1,
} as const;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function overlapRatio(skills: string[], tags: string[]): number {
  if (skills.length === 0 || tags.length === 0) return 0.4;
  const normalizedTags = tags.map(normalizeSearch);
  const matches = skills.filter((skill) => {
    const needle = normalizeSearch(skill);
    return normalizedTags.some((tag) => tag.includes(needle) || needle.includes(tag));
  });
  return matches.length / Math.min(skills.length, tags.length);
}

export interface MatchContext {
  user: Pick<User, "skills" | "rating" | "completedProjects" | "hourlyRate" | "city"> & {
    categories?: string[];
  };
  /** How many proposals the project already has (competition pressure). */
  competitorCount?: number;
}

export function computeMatchScore(project: Project, context: MatchContext): MatchScore {
  const skills = context.user.skills ?? [];
  const rating = context.user.rating ?? 3.5;
  const completed = context.user.completedProjects ?? 0;
  const competitors = context.competitorCount ?? project.proposals?.length ?? 0;

  /* ------------------------------------------------------------- skills */
  const skillValue = clamp(Math.round(overlapRatio(skills, project.tags ?? []) * 100));

  /* ----------------------------------------------------------- category */
  const knownCategories = context.user.categories ?? [];
  const categoryMatch = knownCategories.some(
    (category) =>
      normalizeSearch(category) === normalizeSearch(project.category?.englishTitle ?? "") ||
      normalizeSearch(category) === normalizeSearch(project.category?.title ?? "")
  );
  const categoryValue = categoryMatch ? 95 : tagsHintCategory(project, skills) ? 70 : 45;

  /* ------------------------------------------------------------- budget */
  const budget = project.budget || 0;
  const hourlyRate = context.user.hourlyRate ?? 0;
  const estimatedHours = Math.max(8, project.tags?.length ? project.tags.length * 14 : 40);
  const impliedRate = hourlyRate > 0 ? budget / estimatedHours : 0;
  const budgetValue =
    hourlyRate === 0
      ? 70
      : clamp(Math.round(50 + (impliedRate / Math.max(hourlyRate, 1)) * 50 - 50), 20, 100);

  /* ----------------------------------------------------------- deadline */
  const daysLeft = Math.max(
    1,
    Math.round((new Date(project.deadline).getTime() - Date.now()) / 86_400_000)
  );
  const estimatedDuration = Math.max(3, Math.round(estimatedHours / 6));
  const slack = daysLeft - estimatedDuration;
  const deadlineValue = clamp(Math.round(60 + slack * 2), 15, 100);

  /* -------------------------------------------------------- competition */
  const competitionValue = clamp(Math.round(100 - competitors * 12), 10, 100);

  /* -------------------------------------------------------- reputation */
  const reputationValue = clamp(
    Math.round(rating * 14 + Math.min(completed, 30) * 1.4),
    20,
    100
  );

  const factors = [
    { key: "skills", value: skillValue, weight: WEIGHTS.skills },
    { key: "category", value: categoryValue, weight: WEIGHTS.category },
    { key: "budget", value: budgetValue, weight: WEIGHTS.budget },
    { key: "deadline", value: deadlineValue, weight: WEIGHTS.deadline },
    { key: "competition", value: competitionValue, weight: WEIGHTS.competition },
    { key: "reputation", value: reputationValue, weight: WEIGHTS.reputation },
  ];

  const score = Math.round(
    factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0)
  );

  return {
    score: clamp(score),
    tier: score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "weak",
    factors: factors.map((factor) => ({
      ...factor,
      labelKey: `matching.factor.${factor.key}`,
      detail: undefined,
    })),
  };
}

/** Fallback heuristic when the user has no declared category history. */
function tagsHintCategory(project: Project, skills: string[]): boolean {
  const haystack = normalizeSearch(`${project.title} ${project.description}`);
  return skills.some((skill) => haystack.includes(normalizeSearch(skill)));
}

export interface RankedProject {
  project: Project;
  score: MatchScore;
}

/** Ranks open projects for a freelancer, best first. */
export function rankProjectsForUser(
  projects: Project[],
  context: MatchContext,
  limit = 6
): RankedProject[] {
  return projects
    .filter((project) => project.status === "OPEN")
    .map((project) => ({ project, score: computeMatchScore(project, context) }))
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Trust & safety                                                             */
/* -------------------------------------------------------------------------- */

export interface RiskContext {
  /** Average accepted proposal price for the same category. */
  categoryAveragePrice?: number;
  /** Average project budget in the same category. */
  categoryAverageBudget?: number;
  author?: Pick<User, "rating" | "completedProjects" | "createdAt">;
}

/**
 * Heuristic risk screening for a proposal.
 *
 * Purely advisory: it flags bids whose price deviates wildly from the category
 * norm, durations that do not match the money, and brand-new accounts, so the
 * admin console can review a short queue instead of every row.
 */
export function assessProposalRisk(proposal: Partial<Proposal>, context: RiskContext = {}): RiskAssessment {
  const flags: RiskAssessment["flags"] = [];
  const budget = context.categoryAverageBudget ?? 0;
  const price = proposal.price ?? 0;
  const duration = proposal.duration ?? 0;

  if (budget > 0) {
    const ratio = price / budget;
    if (ratio > 2.2 || ratio < 0.25) {
      flags.push({ key: "priceAnomaly", labelKey: "trust.flag.priceAnomaly", severity: "high" });
    } else if (ratio < 0.45) {
      flags.push({ key: "priceTooLow", labelKey: "trust.flag.priceTooLow", severity: "medium" });
    }
  }

  if (price > 0 && duration > 0) {
    const perDay = price / duration;
    const baseline = (context.categoryAveragePrice ?? budget) / 30;
    if (baseline > 0 && (perDay < baseline * 0.25 || perDay > baseline * 4)) {
      flags.push({
        key: "durationAnomaly",
        labelKey: "trust.flag.durationAnomaly",
        severity: "medium",
      });
    }
  }

  if (context.author) {
    const accountAgeDays = context.author.createdAt
      ? (Date.now() - new Date(context.author.createdAt).getTime()) / 86_400_000
      : 999;
    if (accountAgeDays < 7 && (context.author.completedProjects ?? 0) === 0) {
      flags.push({ key: "newAccount", labelKey: "trust.flag.newAccount", severity: "medium" });
    }
    if ((context.author.rating ?? 5) < 3.2) {
      flags.push({ key: "lowRating", labelKey: "trust.flag.lowRating", severity: "low" });
    }
  }

  const score = flags.reduce(
    (sum, flag) => sum + (flag.severity === "high" ? 45 : flag.severity === "medium" ? 25 : 10),
    0
  );

  return {
    score: clamp(score),
    level: score >= 45 ? "high" : score >= 25 ? "medium" : "low",
    flags,
  };
}

/* -------------------------------------------------------------------------- */
/* Price simulator                                                            */
/* -------------------------------------------------------------------------- */

export interface SimulationInput {
  budget: number;
  price: number;
  duration: number;
  competitorCount?: number;
  expectedDuration?: number;
}

export interface SimulationResult {
  probability: number;
  verdict: "strong" | "ok" | "weak";
  suggestedMin: number;
  suggestedMax: number;
  breakdown: Array<{ key: string; impact: number }>;
}

/**
 * "What-if" acceptance simulator.
 *
 * A transparent logistic-ish model: it compares the bid to the project budget,
 * the delivery window to a reference duration, and applies a competition
 * penalty. The goal is not statistical truth but an interactive, explainable
 * guide that helps a freelancer calibrate a bid before submitting it.
 */
export function simulateProposal(input: SimulationInput): SimulationResult {
  const { budget, price, duration } = input;
  const competitors = input.competitorCount ?? 3;
  const expectedDuration = input.expectedDuration ?? 30;

  const priceRatio = budget > 0 ? price / budget : 1;
  const priceImpact = clamp(60 * (1 - Math.abs(priceRatio - 0.8) / 0.8), -60, 40);
  const durationImpact = clamp(45 * (1 - Math.abs(duration - expectedDuration) / expectedDuration), -45, 30);
  const competitionImpact = clamp(-competitors * 4, -30, 0);

  const raw = 55 + priceImpact * 0.5 + durationImpact * 0.35 + competitionImpact * 0.3;
  const probability = clamp(Math.round(raw), 4, 96) / 100;

  return {
    probability,
    verdict: probability >= 0.6 ? "strong" : probability >= 0.35 ? "ok" : "weak",
    suggestedMin: Math.round((budget * 0.62) / 100_000) * 100_000,
    suggestedMax: Math.round((budget * 0.96) / 100_000) * 100_000,
    breakdown: [
      { key: "price", impact: Math.round(priceImpact) },
      { key: "duration", impact: Math.round(durationImpact) },
      { key: "competition", impact: Math.round(competitionImpact) },
    ],
  };
}

/** What the freelancer actually receives after the platform fee. */
export function netPayout(price: number): { fee: number; net: number } {
  const fee = Math.round(price * PLATFORM_FEE_RATE);
  return { fee, net: price - fee };
}
