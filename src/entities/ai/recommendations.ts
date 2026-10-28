import { PLATFORM_FEE_RATE } from "@/config/constants";
import { normalizeSearch } from "@/lib/format/text";
import { getActiveLocale } from "@/lib/locale";
import type { Project, User } from "@/types";

export interface SkillGap {
  skill: string;
  importance: "high" | "medium" | "low";
  impactPercent: number;
}

export interface OptimalBidAdvice {
  suggestedBid: number;
  minViableBid: number;
  maxCompetitiveBid: number;
  winProbability: number;
  expectedEarnings: number;
  confidenceScore: number;
  reasons: string[];
}

export interface AIProjectRecommendation {
  project: Project;
  recommendationScore: number; // 0 - 100
  tier: "strong-match" | "recommended" | "moderate" | "reach";
  winProbability: number; // 0 - 1
  skillGaps: SkillGap[];
  matchingSkills: string[];
  bidAdvice: OptimalBidAdvice;
  explanation: {
    summary: string;
    strengths: string[];
    risks: string[];
  };
}

/**
 * Normalizes an array of skills or tags into trimmed, unified search tokens.
 */
function normalizeSkillList(list: string[] = []): string[] {
  return list.map((item) => normalizeSearch(item)).filter(Boolean);
}

/**
 * Evaluates skill overlap and calculates missing critical skills.
 */
export function analyzeSkillGaps(
  userSkills: string[] = [],
  projectTags: string[] = []
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
      // First tags are generally higher importance
      const importance: SkillGap["importance"] =
        index === 0 ? "high" : index === 1 ? "medium" : "low";
      const impactPercent = Math.max(10, Math.round(35 - index * 7));
      gaps.push({ skill: tag, importance, impactPercent });
    }
  });

  return { matching, gaps };
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

  // Baseline bid corridor: 70% to 95% of budget
  let discountFactor = 0.85;

  // High competition forces sharper pricing
  if (competitorsCount > 5) {
    discountFactor -= 0.08;
  } else if (competitorsCount === 0) {
    discountFactor += 0.05;
  }

  // Veteran freelancers can charge higher premiums
  if (completed >= 5 && userRating >= 4.5) {
    discountFactor += 0.08;
  } else if (completed === 0) {
    discountFactor -= 0.05;
  }

  const clampedDiscount = Math.min(0.98, Math.max(0.65, discountFactor));
  const suggestedBid = Math.round((budget * clampedDiscount) / 10_000) * 10_000;
  const minViableBid = Math.round((budget * 0.65) / 10_000) * 10_000;
  const maxCompetitiveBid = Math.round((budget * 0.95) / 10_000) * 10_000;

  // Win probability calculation via logistic curve
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

  // Weighted score formulation
  const skillScore = skillRatio * 50;
  const probabilityScore = bidAdvice.winProbability * 35;
  const reputationScore = Math.min(15, (user.completedProjects ?? 0) * 2 + (user.rating ?? 3) * 2);

  const recommendationScore = Math.round(
    Math.min(100, Math.max(10, skillScore + probabilityScore + reputationScore))
  );

  let tier: AIProjectRecommendation["tier"] = "moderate";
  if (recommendationScore >= 80) tier = "strong-match";
  else if (recommendationScore >= 65) tier = "recommended";
  else if (recommendationScore < 40) tier = "reach";

  const isEn = getActiveLocale() === "en";
  const strengths: string[] = [];
  const risks: string[] = [];

  if (matching.length > 0) {
    strengths.push(
      isEn
        ? `Alignment in core skills: ${matching.slice(0, 3).join(", ")}`
        : `تطابق در مهارت‌های کلیدی: ${matching.slice(0, 3).join("، ")}`
    );
  }
  if (bidAdvice.winProbability >= 0.6) {
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
  if ((project.proposals?.length ?? 0) > 8) {
    risks.push(
      isEn
        ? "High competitor bid concentration on this project."
        : "تراکم بالای پیشنهادات رقیب در این پروژه."
    );
  }

  const summary = isEn
    ? tier === "strong-match"
      ? "Project is an ideal match for your verified skills and historical win rate."
      : tier === "recommended"
      ? "Strong candidate project for submitting a competitive proposal."
      : "Project requires careful evaluation of complementary skills."
    : tier === "strong-match"
    ? "پروژه در هماهنگی ایده‌آل با مهارت‌ها و نرخ برنده شدن شماست."
    : tier === "recommended"
    ? "پروژه مناسب برای ارائه پیشنهاد رقابتی."
    : "پروژه نیازمند بررسی دقیق مهارت‌های تکمیلی است.";

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

/**
 * Ranks all available projects using explainable AI scoring for a given freelancer.
 */
export function rankProjectsWithAI(
  projects: Project[],
  user: Pick<User, "skills" | "rating" | "completedProjects">
): AIProjectRecommendation[] {
  return projects
    .map((project) => evaluateProjectRecommendation(project, user))
    .sort((a, b) => b.recommendationScore - a.recommendationScore);
}
