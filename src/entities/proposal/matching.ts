import { PLATFORM_FEE_RATE } from "@/config/constants";
import { normalizeSearch } from "@/lib/format/text";
import type { MatchScore, Project, Proposal, RiskAssessment, User } from "@/types";

export type MatchFactor = MatchScore["factors"][number];
export type MatchBreakdown = MatchScore;
export type MatchingContext = MatchContext;
export type RiskFlag = RiskAssessment["flags"][number];
export type { MatchScore };

export interface MatchContext {
  readonly user: Pick<User, "skills" | "rating" | "completedProjects" | "hourlyRate"> & {
    readonly city?: string;
    readonly categories?: readonly string[];
  };
  readonly competitorCount?: number;
}

export interface RankedProject {
  readonly project: Project;
  readonly score: MatchScore;
}

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

function overlapRatio(skills: readonly string[], tags: readonly string[]): number {
  if (skills.length === 0 || tags.length === 0) return 0.4;
  const normalizedTags = tags.map(normalizeSearch);
  const matches = skills.filter((skill) => {
    const needle = normalizeSearch(skill);
    return normalizedTags.some((tag) => tag.includes(needle) || needle.includes(tag));
  });
  return matches.length / Math.min(skills.length, tags.length);
}

function computeCategoryMatchValue(categoryMatch: boolean, hasTagHint: boolean): number {
  if (categoryMatch) return 95;
  if (hasTagHint) return 70;
  return 45;
}

function resolveScoreTier(score: number): MatchScore["tier"] {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "weak";
}

/** Fallback heuristic when the user has no declared category history. */
function tagsHintCategory(project: Project, skills: readonly string[]): boolean {
  const haystack = normalizeSearch(`${project.title} ${project.description}`);
  return skills.some((skill) => haystack.includes(normalizeSearch(skill)));
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
  const categoryValue = computeCategoryMatchValue(categoryMatch, tagsHintCategory(project, skills));

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
    tier: resolveScoreTier(score),
    factors: factors.map((factor) => ({
      ...factor,
      labelKey: `matching.factor.${factor.key}`,
      detail: undefined,
    })),
  };
}

export const calculateMatch = computeMatchScore;

export function rankProjectsForUser(
  projects: readonly Project[],
  context: MatchContext,
  limit = 5
): RankedProject[] {
  return projects
    .filter((project) => project.status === "OPEN")
    .map((project) => ({
      project,
      score: computeMatchScore(project, context),
    }))
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Trust & safety                                                             */
/* -------------------------------------------------------------------------- */

export interface RiskContext {
  /** Average accepted proposal price for the same category. */
  readonly categoryAveragePrice?: number;
  /** Average project budget in the same category. */
  readonly categoryAverageBudget?: number;
  readonly author?: Pick<User, "rating" | "completedProjects" | "createdAt">;
}

const SEVERITY_WEIGHTS: Record<RiskFlag["severity"], number> = {
  high: 45,
  medium: 25,
  low: 10,
};

function resolveRiskLevel(score: number): RiskAssessment["level"] {
  if (score >= 45) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function checkPriceAndDurationFlags(
  proposal: Partial<Proposal>,
  context: RiskContext,
  flags: RiskFlag[]
): void {
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
}

function checkAuthorFlags(author: RiskContext["author"], flags: RiskFlag[]): void {
  if (!author) return;
  const accountAgeDays = author.createdAt
    ? (Date.now() - new Date(author.createdAt).getTime()) / 86_400_000
    : 999;
  if (accountAgeDays < 7 && (author.completedProjects ?? 0) === 0) {
    flags.push({ key: "newAccount", labelKey: "trust.flag.newAccount", severity: "medium" });
  }
  if ((author.rating ?? 5) < 3.2) {
    flags.push({ key: "lowRating", labelKey: "trust.flag.lowRating", severity: "low" });
  }
}

/**
 * Heuristic risk screening for a proposal.
 */
export function assessProposalRisk(proposal: Partial<Proposal>, context: RiskContext = {}): RiskAssessment {
  const flags: RiskFlag[] = [];
  checkPriceAndDurationFlags(proposal, context, flags);
  checkAuthorFlags(context.author, flags);

  const score = flags.reduce((sum, flag) => sum + SEVERITY_WEIGHTS[flag.severity], 0);

  return {
    score: clamp(score),
    level: resolveRiskLevel(score),
    flags,
  };
}

/* -------------------------------------------------------------------------- */
/* Price simulator                                                            */
/* -------------------------------------------------------------------------- */

export interface SimulationInput {
  readonly budget: number;
  readonly price: number;
  readonly duration: number;
  readonly competitorCount?: number;
  readonly expectedDuration?: number;
}

export interface SimulationResult {
  readonly probability: number;
  readonly verdict: "strong" | "ok" | "weak";
  readonly suggestedMin: number;
  readonly suggestedMax: number;
  readonly breakdown: readonly { readonly key: string; readonly impact: number }[];
}

function resolveSimulationVerdict(probability: number): SimulationResult["verdict"] {
  if (probability >= 0.6) return "strong";
  if (probability >= 0.35) return "ok";
  return "weak";
}

/**
 * "What-if" acceptance simulator.
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
    verdict: resolveSimulationVerdict(probability),
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
