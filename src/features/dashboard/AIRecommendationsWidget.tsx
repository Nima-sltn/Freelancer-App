import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { rankProjectsWithAI, type AIProjectRecommendation } from "@/entities/ai";
import { formatCurrency, formatNumber } from "@/lib/format/numbers";
import { useT } from "@/store/i18n";
import type { Project, User } from "@/types";

interface AIRecommendationsWidgetProps {
  readonly projects: readonly Project[];
  readonly user: User;
}

function getTierTone(tier: AIProjectRecommendation["tier"]): "success" | "primary" | "warning" | "neutral" {
  if (tier === "strong-match") return "success";
  if (tier === "recommended") return "primary";
  if (tier === "moderate") return "warning";
  return "neutral";
}

function getTierTranslationKey(tier: AIProjectRecommendation["tier"]): "matching.tier.excellent" | "matching.tier.good" | "matching.tier.fair" {
  if (tier === "strong-match") return "matching.tier.excellent";
  if (tier === "recommended") return "matching.tier.good";
  return "matching.tier.fair";
}

export function AIRecommendationsWidget({ projects, user }: Readonly<AIRecommendationsWidgetProps>) {
  const { t } = useT();
  const recommendations = useMemo(() => {
    return rankProjectsWithAI(projects, user).slice(0, 3);
  }, [projects, user]);

  if (recommendations.length === 0) return null;

  return (
    <Card className="rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-surface to-surface shadow-xs">
      <CardHeader
        title={t("ai.recommendationsTitle")}
        description={t("ai.recommendationsSubtitle")}
      />
      <CardContent className="mt-4 space-y-4">
        {recommendations.map((rec: AIProjectRecommendation) => (
          <RecommendationCard key={rec.project._id} rec={rec} />
        ))}
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ rec }: Readonly<{ readonly rec: AIProjectRecommendation }>) {
  const { t, locale } = useT();
  const { project, recommendationScore, tier, bidAdvice, explanation, matchingSkills, skillGaps } = rec;
  const isEn = locale === "en";
  const displayTitle = isEn && project.titleEn ? project.titleEn : project.title;

  const tierBadgeTone = getTierTone(tier);

  return (
    <div className="rounded-xl border border-line bg-surface p-4 transition-all hover:border-primary-500/40 hover:shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            to={`/freelancer/projects/${project._id}`}
            className="text-sm font-bold text-ink hover:text-primary-600"
          >
            {displayTitle}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span>{t("field.budget")}: {formatCurrency(project.budget)}</span>
            <span>•</span>
            <span>{t("projects.proposalCount", { count: project.proposals?.length ?? 0 })}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={tierBadgeTone}>
            {t(getTierTranslationKey(tier))} ({formatNumber(recommendationScore)}{isEn ? "%" : "٪"})
          </Badge>
        </div>
      </div>

      <p className="mt-2 text-xs leading-6 text-ink-soft">{explanation.summary}</p>

      {/* Matching Skills & Gaps */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[0.7rem] font-bold text-ink-muted">{t("ai.skillMatch")}:</span>
        {matchingSkills.map((skill) => (
          <span
            key={skill}
            className="rounded-md bg-success/10 px-2 py-0.5 text-[0.7rem] font-medium text-success"
          >
            ✓ {skill}
          </span>
        ))}
        {skillGaps.map((gap) => (
          <span
            key={gap.skill}
            className="rounded-md bg-warning/10 px-2 py-0.5 text-[0.7rem] font-medium text-warning"
          >
            + {gap.skill}
          </span>
        ))}
      </div>

      {/* Optimal Bid Insight */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-sunken p-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ink-muted">{t("ai.optimalBid")}: </span>
          <span className="font-bold text-ink">
            {formatCurrency(bidAdvice.suggestedBid)}
          </span>
          <span className="text-ink-muted">|</span>
          <span className="text-ink-muted">{t("ai.winChance")}: </span>
          <span className="font-bold text-primary-600">
            {formatNumber(Math.round(bidAdvice.winProbability * 100))}{isEn ? "%" : "٪"}
          </span>
        </div>

        <Button
          size="sm"
          to={`/freelancer/projects/${project._id}`}
          className="rounded-xl"
        >
          {t("proposals.create")}
        </Button>
      </div>
    </div>
  );
}

export default AIRecommendationsWidget;
