import { PLATFORM_FEE_RATE } from "@/config/constants";
import { normalizeSearch } from "@/lib/format/text";
import { getActiveLocale } from "@/lib/locale";
import type { Project, User } from "@/types";

export interface SkillGap {
  readonly skill: string;
  readonly importance: "high" | "medium" | "low";
  readonly impactPercent: number;
}

export interface OptimalBidAdvice {
  readonly suggestedBid: number;
  readonly minViableBid: number;
  readonly maxCompetitiveBid: number;
  readonly winProbability: number;
  readonly expectedEarnings: number;
  readonly confidenceScore: number;
  readonly reasons: readonly string[];
}

export interface AIProjectRecommendation {
  readonly project: Project;
  readonly recommendationScore: number; // 0 - 100
  readonly tier: "strong-match" | "recommended" | "moderate" | "reach";
  readonly winProbability: number; // 0 - 1
  readonly skillGaps: readonly SkillGap[];
  readonly matchingSkills: readonly string[];
  readonly bidAdvice: OptimalBidAdvice;
  readonly explanation: {
    readonly summary: string;
    readonly strengths: readonly string[];
    readonly risks: readonly string[];
  };
}

/**
 * Normalizes an array of skills or tags into trimmed, unified search tokens.
 */
function normalizeSkillList(list: readonly string[] = []): string[] {
  return list.map((item) => normalizeSearch(item)).filter(Boolean);
}

function getTagImportance(index: number): SkillGap["importance"] {
  if (index === 0) return "high";
  if (index === 1) return "medium";
  return "low";
}

/**
 * Evaluates skill overlap and calculates missing critical skills.
 */
export function analyzeSkillGaps(
  userSkills: readonly string[] = [],
  projectTags: readonly string[] = []
): { matching: string[]; gaps: SkillGap[] } {
  const normUser = normalizeSkillList(userSkills);
  const matching: string[] = [];
  const gaps: SkillGap[] = [];

  projectTags.forEach((tag, index) => {
    const normTag = normalizeSearch(tag);
    const hasSkill = normUser.some(
      (s) => s.includes(normTag) || normTag.includes(s)
    );

    if (hasSkill) {
      matching.push(tag);
    } else {
      const importance = getTagImportance(index);
      const impactPercent = Math.max(10, Math.round(35 - index * 7));
      gaps.push({ skill: tag, importance, impactPercent });
    }
  });

  return { matching, gaps };
}

function computeBidReasons(competitorsCount: number, completed: number, isEn: boolean): string[] {
  const reasons: string[] = [];
  if (competitorsCount === 0) {
    reasons.push(
      isEn
        ? "Being the first bidder significantly boosts your acceptance probability."
        : "اولین پیشنهاد دهنده بودن شانس پذیرش را به طور چشمگیری بالا می‌برد."
    );
  } else if (competitorsCount > 6) {
    reasons.push(
      isEn
        ? "Competition is intense; a slightly more economical price protects your winning edge."
        : "رقابت شدید است؛ قیمت کمی اقتصادی‌تر شانس برنده شدن را حفظ می‌کند."
    );
  }

  if (completed >= 5) {
    reasons.push(
      isEn
        ? "Your strong track record allows bidding with healthier profit margins."
        : "سابقه موفق شما امکان پیشنهاد قیمت با حاشیه سود بالاتر را فراهم می‌کند."
    );
  } else {
    reasons.push(
      isEn
        ? "To build platform reputation, bidding in the competitive mid-range is recommended."
        : "برای تقویت سابقه، پیشنهاد در بازه میانی رقابتی توصیه می‌شود."
    );
  }
  return reasons;
}

/**
 * Predicts the optimal bid amount to maximize expected value (P(win) * NetPayout).
 */
export function predictOptimalBid(
  project: Project,
  user: Pick<User, "rating" | "completedProjects">
): OptimalBidAdvice {
  const budget = project.budget > 0 ? project.budget : 1_000_000;
  const competitorsCount = project.proposals?.length ?? 0;
  const userRating = user.rating ?? 3.5;
  const completed = user.completedProjects ?? 0;

  let discountFactor = 0.85;

  if (competitorsCount > 5) {
    discountFactor -= 0.08;
  } else if (competitorsCount === 0) {
    discountFactor += 0.05;
  }

  if (completed >= 5 && userRating >= 4.5) {
    discountFactor += 0.08;
  } else if (completed === 0) {
    discountFactor -= 0.05;
  }

  const clampedDiscount = Math.min(0.98, Math.max(0.65, discountFactor));
  const suggestedBid = Math.round((budget * clampedDiscount) / 10_000) * 10_000;
  const minViableBid = Math.round((budget * 0.65) / 10_000) * 10_000;
  const maxCompetitiveBid = Math.round((budget * 0.95) / 10_000) * 10_000;

  const priceRatio = suggestedBid / budget;
  const ratingBonus = (userRating - 3.0) * 0.3;
  const logit = 1.2 - priceRatio * 2.0 + ratingBonus - competitorsCount * 0.08;
  const winProbability = Math.min(0.95, Math.max(0.08, 1 / (1 + Math.exp(-logit))));

  const netPayout = suggestedBid * (1 - PLATFORM_FEE_RATE);
  const expectedEarnings = Math.round(netPayout * winProbability);
  const confidenceScore = Math.round(
    Math.min(100, 60 + Math.min(completed * 4, 30) + (userRating >= 4 ? 10 : 0))
  );

  const isEn = getActiveLocale() === "en";
  const reasons = computeBidReasons(competitorsCount, completed, isEn);

  return {
    suggestedBid,
    minViableBid,
    maxCompetitiveBid,
    winProbability: Math.round(winProbability * 100) / 100,
    expectedEarnings,
    confidenceScore,
    reasons,
  };
}

const SUMMARY_MESSAGES: Record<"en" | "fa", Record<AIProjectRecommendation["tier"], string>> = {
  en: {
    "strong-match": "Project is an ideal match for your verified skills and historical win rate.",
    "recommended": "Strong candidate project for submitting a competitive proposal.",
    "moderate": "Project requires careful evaluation of complementary skills.",
    "reach": "Project requires careful evaluation of complementary skills.",
  },
  fa: {
    "strong-match": "پروژه در هماهنگی ایده‌آل با مهارت‌ها و نرخ برنده شدن شماست.",
    "recommended": "پروژه مناسب برای ارائه پیشنهاد رقابتی.",
    "moderate": "پروژه نیازمند بررسی دقیق مهارت‌های تکمیلی است.",
    "reach": "پروژه نیازمند بررسی دقیق مهارت‌های تکمیلی است.",
  },
};

function buildStrengthsAndRisks(
  matching: readonly string[],
  gaps: readonly SkillGap[],
  winProbability: number,
  proposalsCount: number,
  isEn: boolean
): { strengths: string[]; risks: string[] } {
  const strengths: string[] = [];
  const risks: string[] = [];

  if (matching.length > 0) {
    strengths.push(
      isEn
        ? `Alignment in core skills: ${matching.slice(0, 3).join(", ")}`
        : `تطابق در مهارت‌های کلیدی: ${matching.slice(0, 3).join("، ")}`
    );
  }
  if (winProbability >= 0.6) {
    strengths.push(
      isEn
        ? "Win probability in the projected price corridor is highly favorable."
        : "شانس برنده شدن در بازه قیمتی پیش‌بینی‌شده بسیار مطلوب است."
    );
  }

  if (gaps.length > 0) {
    risks.push(
      isEn
        ? `Skill gap identified: ${gaps.map((g) => g.skill).slice(0, 2).join(", ")}`
        : `عدم تطابق مهارت: ${gaps.map((g) => g.skill).slice(0, 2).join("، ")}`
    );
  }
  if (proposalsCount > 8) {
    risks.push(
      isEn
        ? "High competitor bid concentration on this project."
        : "تراکم بالای پیشنهادات رقیب در این پروژه."
    );
  }

  return { strengths, risks };
}

function resolveRecommendationTier(score: number): AIProjectRecommendation["tier"] {
  if (score >= 80) return "strong-match";
  if (score >= 65) return "recommended";
  if (score < 40) return "reach";
  return "moderate";
}

/**
 * Comprehensive AI project match and recommendation.
 */
export function evaluateProjectRecommendation(
  project: Project,
  user: Pick<User, "skills" | "rating" | "completedProjects">
): AIProjectRecommendation {
  const { matching, gaps } = analyzeSkillGaps(user.skills, project.tags);
  const bidAdvice = predictOptimalBid(project, user);

  const totalTags = Math.max(1, project.tags?.length ?? 1);
  const skillRatio = matching.length / totalTags;

  const skillScore = skillRatio * 50;
  const probabilityScore = bidAdvice.winProbability * 35;
  const reputationScore = Math.min(15, (user.completedProjects ?? 0) * 2 + (user.rating ?? 3) * 2);

  const recommendationScore = Math.round(
    Math.min(100, Math.max(10, skillScore + probabilityScore + reputationScore))
  );

  const tier = resolveRecommendationTier(recommendationScore);
  const isEn = getActiveLocale() === "en";
  const { strengths, risks } = buildStrengthsAndRisks(
    matching,
    gaps,
    bidAdvice.winProbability,
    project.proposals?.length ?? 0,
    isEn
  );

  const summary = SUMMARY_MESSAGES[isEn ? "en" : "fa"][tier];

  return {
    project,
    recommendationScore,
    tier,
    winProbability: bidAdvice.winProbability,
    skillGaps: gaps,
    matchingSkills: matching,
    bidAdvice,
    explanation: {
      summary,
      strengths,
      risks,
    },
  };
}

export function rankProjectsWithAI(
  projects: readonly Project[],
  user: Pick<User, "skills" | "rating" | "completedProjects">,
  limit?: number
): AIProjectRecommendation[] {
  const ranked = projects
    .filter((p) => p.status === "OPEN")
    .map((p) => evaluateProjectRecommendation(p, user))
    .sort((a, b) => b.recommendationScore - a.recommendationScore);
  return limit !== undefined ? ranked.slice(0, limit) : ranked;
}

export const rankProjectsForUser = rankProjectsWithAI;
