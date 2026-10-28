import { PLATFORM_FEE_RATE } from "@/config/constants";
import { formatMonthKey, formatMonthLabel } from "@/lib/format/dates";
import { formatCurrency } from "@/lib/format/numbers";
import { getActiveLocale } from "@/lib/locale";
import type {
  AnalyticsSnapshot,
  Category,
  DistributionSlice,
  Project,
  Proposal,
  SeriesPoint,
  User,
} from "@/types";

/**
 * Analytics engine.
 *
 * Everything the dashboards show is computed here from the data the client
 * already holds — no analytics endpoint, no third-party tracker, no sampling.
 * Being pure functions makes the numbers deterministic and unit-testable, and
 * means the same code serves live mode and demo mode.
 */

const MONTHS_BACK = 8;

function monthlyBuckets(now: Date): Array<{ key: string; label: string }> {
  return Array.from({ length: MONTHS_BACK }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1 - index), 1);
    return { key: formatMonthKey(date), label: formatMonthLabel(date) };
  });
}

function countByMonth(dates: Array<string | undefined>, now: Date): Map<string, number> {
  const map = new Map<string, number>();
  dates.forEach((value) => {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const key = formatMonthKey(date);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return map;
}

export interface AnalyticsInput {
  projects: Project[];
  proposals: Proposal[];
  users?: User[];
  categories?: Category[];
  now?: Date;
}

export function buildAnalyticsSnapshot({
  projects,
  proposals,
  users = [],
  categories = [],
  now = new Date(),
}: AnalyticsInput): AnalyticsSnapshot {
  const openProjects = projects.filter((project) => project.status === "OPEN");
  const accepted = proposals.filter((proposal) => proposal.status === 2);

  const totalBudget = projects.reduce((sum, project) => sum + (project.budget || 0), 0);
  const totalAcceptedValue = accepted.reduce((sum, proposal) => sum + (proposal.price || 0), 0);
  const pendingValue = proposals
    .filter((proposal) => proposal.status === 1)
    .reduce((sum, proposal) => sum + (proposal.price || 0), 0);

  const escrow = totalAcceptedValue + pendingValue * 0.35;
  const released = totalAcceptedValue * (1 - PLATFORM_FEE_RATE);

  /* ----------------------------------------------------------- timeline */
  const projectsByMonth = countByMonth(
    projects.map((project) => project.createdAt),
    now
  );
  const proposalsByMonth = countByMonth(
    proposals.map((proposal) => proposal.createdAt),
    now
  );

  const timeline: SeriesPoint[] = monthlyBuckets(now).map((bucket) => ({
    label: bucket.label,
    value: projectsByMonth.get(bucket.key) ?? 0,
    secondary: proposalsByMonth.get(bucket.key) ?? 0,
  }));

  const isEn = getActiveLocale() === "en";

  /* --------------------------------------------------- category mix */
  const categoryCounts = new Map<string, { label: string; value: number; budget: number }>();
  projects.forEach((project) => {
    const key = project.category?._id ?? "unknown";
    const label = (isEn ? (project.category as any)?.englishTitle || project.category?.title : project.category?.title) ?? (isEn ? "Other" : "سایر");
    const current = categoryCounts.get(key) ?? { label, value: 0, budget: 0 };
    current.value += 1;
    current.budget += project.budget || 0;
    categoryCounts.set(key, current);
  });

  if (categories.length > 0) {
    categories.forEach((category) => {
      if (!categoryCounts.has(category._id)) {
        const label = (isEn ? category.englishTitle || category.title : category.title) ?? (isEn ? "Other" : "سایر");
        categoryCounts.set(category._id, { label, value: 0, budget: 0 });
      }
    });
  }

  const categoryDistribution: DistributionSlice[] = [...categoryCounts.values()]
    .sort((a, b) => b.value - a.value)
    .map((item) => ({ label: item.label, value: item.value }));

  /* -------------------------------------------------- status mix */
  const statusDistribution: DistributionSlice[] = [
    { label: "status.proposal.pending", value: proposals.filter((p) => p.status === 1).length },
    { label: "status.proposal.accepted", value: accepted.length },
    { label: "status.proposal.rejected", value: proposals.filter((p) => p.status === 0).length },
  ].filter((slice) => slice.value > 0);

  /* --------------------------------------------------- budget buckets */
  const bucketEdges = [0, 5, 15, 40, 100, Number.POSITIVE_INFINITY];
  const bucketLabels = isEn
    ? ["< 5M", "5-15M", "15-40M", "40-100M", "> 100M"]
    : ["< ۵", "۵ تا ۱۵", "۱۵ تا ۴۰", "۴۰ تا ۱۰۰", "> ۱۰۰"];
  const budgetBuckets: SeriesPoint[] = bucketLabels.map((label, index) => ({
    label,
    value: projects.filter(
      (project) =>
        (project.budget || 0) / 1_000_000 >= bucketEdges[index] &&
        (project.budget || 0) / 1_000_000 < bucketEdges[index + 1]
    ).length,
  }));

  /* ----------------------------------------------------------- rates */
  const decided = proposals.filter((proposal) => proposal.status !== 1).length;
  const acceptanceRate = decided > 0 ? accepted.length / decided : 0;
  const proposalsPerProject = projects.length > 0 ? proposals.length / projects.length : 0;
  const averageDeliveryDays =
    accepted.length > 0
      ? accepted.reduce((sum, proposal) => sum + (proposal.duration || 0), 0) / accepted.length
      : 0;

  return {
    totals: {
      projects: projects.length,
      openProjects: openProjects.length,
      proposals: proposals.length,
      acceptedProposals: accepted.length,
      users: users.length,
      pendingUsers: users.filter((user) => Number(user.status) === 1).length,
    },
    money: {
      escrow: Math.round(escrow),
      released: Math.round(released),
      averageBudget: projects.length > 0 ? Math.round(totalBudget / projects.length) : 0,
      averageProposal:
        proposals.length > 0
          ? Math.round(
              proposals.reduce((sum, proposal) => sum + (proposal.price || 0), 0) / proposals.length
            )
          : 0,
    },
    rates: {
      acceptanceRate,
      averageProposalsPerProject: proposalsPerProject,
      averageDeliveryDays: Math.round(averageDeliveryDays),
    },
    timeline,
    categoryDistribution,
    statusDistribution,
    budgetBuckets,
  };
}

/** Human-readable highlights derived from the snapshot. */
export function buildInsights(
  snapshot: AnalyticsSnapshot,
  projects: Project[],
  categories: Category[] = []
): Array<{ key: string; params: Record<string, string | number> }> {
  const isEn = getActiveLocale() === "en";
  const insights: Array<{ key: string; params: Record<string, string | number> }> = [];

  insights.push({
    key: "analytics.insightAcceptance",
    params: { rate: `${Math.round(snapshot.rates.acceptanceRate * 100)}${isEn ? "%" : "٪"}` },
  });

  const bestCategory = [...categories]
    .filter((category) => (category.averageBudget ?? 0) > 0)
    .sort((a, b) => (b.averageBudget ?? 0) - (a.averageBudget ?? 0))[0];

  if (bestCategory) {
    insights.push({
      key: "analytics.insightBestCategory",
      params: { category: isEn ? (bestCategory.englishTitle || bestCategory.title) : bestCategory.title },
    });
  }

  const now = Date.now();
  const urgent = projects.filter((project) => {
    if (project.status !== "OPEN") return false;
    const days = (new Date(project.deadline).getTime() - now) / 86_400_000;
    return days >= 0 && days <= 7;
  }).length;

  if (urgent > 0) {
    insights.push({ key: "analytics.insightUrgent", params: { count: urgent } });
  }

  if (snapshot.totals.pendingUsers > 0) {
    insights.push({
      key: "analytics.insightPendingUsers",
      params: { count: snapshot.totals.pendingUsers },
    });
  }

  return insights;
}

/** Flattens the snapshot into label/value rows for CSV export. */
export function snapshotToRows(
  snapshot: AnalyticsSnapshot
): Array<Record<string, string | number>> {
  const rows: Array<Record<string, string | number>> = [];
  Object.entries(snapshot.totals).forEach(([key, value]) => rows.push({ metric: `totals.${key}`, value }));
  Object.entries(snapshot.money).forEach(([key, value]) => rows.push({ metric: `money.${key}`, value }));
  Object.entries(snapshot.rates).forEach(([key, value]) => rows.push({ metric: `rates.${key}`, value }));
  snapshot.timeline.forEach((point) =>
    rows.push({ metric: `timeline.${point.label}`, value: point.value })
  );
  snapshot.categoryDistribution.forEach((slice) =>
    rows.push({ metric: `category.${slice.label}`, value: slice.value })
  );
  return rows;
}

export { formatCurrency };
