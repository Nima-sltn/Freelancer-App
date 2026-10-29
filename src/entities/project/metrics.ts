import { getDeadlineInfo, type DeadlineInfo } from "@/lib/format/dates";
import { includesQuery, normalizeSearch } from "@/lib/format/text";
import type { Paginated, Project, ProjectFilters, Proposal, SeriesPoint } from "@/types";

/**
 * Project-domain selectors.
 *
 * Pure functions over the project list (filter → sort → paginate) so tables,
 * boards, exports and tests all agree on what "filtered" means. Previously each
 * component (re)implemented its own filtering with slightly different rules.
 */

export function filterProjects(projects: Project[], filters: ProjectFilters): Project[] {
  const search = normalizeSearch(filters.search ?? "");
  const status = filters.status ?? "";
  const category = filters.category ?? "";

  return projects.filter((project) => {
    if (status && status !== "ALL" && project.status !== status) return false;

    if (category && !category.includes("ALL")) {
      const wanted = category.split(",").map(normalizeSearch);
      const haystack = normalizeSearch(
        `${project.category?.englishTitle ?? ""} ${project.category?.title ?? ""}`
      );
      if (!wanted.some((item) => haystack.includes(item))) return false;
    }

    if (filters.minBudget && project.budget < Number(filters.minBudget)) return false;
    if (filters.maxBudget && project.budget > Number(filters.maxBudget)) return false;

    if (search) {
      const haystack = `${project.title} ${project.description} ${(project.tags ?? []).join(" ")}`;
      if (!includesQuery(haystack, search)) return false;
    }

    return true;
  });
}

export function sortProjects(projects: Project[], sort?: string): Project[] {
  const list = [...projects];
  switch (sort) {
    case "earliest":
      return list.sort(
        (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
      );
    case "budgetHigh":
      return list.sort((a, b) => b.budget - a.budget);
    case "budgetLow":
      return list.sort((a, b) => a.budget - b.budget);
    case "deadline":
      return list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    case "proposals":
      return list.sort((a, b) => (b.proposals?.length ?? 0) - (a.proposals?.length ?? 0));
    case "latest":
    default:
      return list.sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
  }
}

export function paginate<T>(items: T[], page = 1, pageSize = 10): Paginated<T> {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total: items.length,
  };
}

export function projectUrgency(project: Project): DeadlineInfo & { label: string } {
  const info = getDeadlineInfo(project.deadline);
  return {
    ...info,
    label: info.isOverdue
      ? `projects.overdue`
      : `projects.deadlineSoon`,
  };
}

/** Aggregates an owner's portfolio for the dashboard hero cards. */
export interface OwnerPortfolioStats {
  total: number;
  open: number;
  closed: number;
  awarded: number;
  totalBudget: number;
  committedBudget: number;
  proposalsReceived: number;
  averageProposals: number;
  urgent: number;
  budgetByCategory: SeriesPoint[];
}

export function buildOwnerPortfolio(projects: Project[]): OwnerPortfolioStats {
  const open = projects.filter((project) => project.status === "OPEN");
  const awarded = projects.filter((project) => Boolean(project.freelancer));
  const proposalsReceived = projects.reduce(
    (sum, project) => sum + (project.proposals?.length ?? 0),
    0
  );

  const byCategory = new Map<string, number>();
  projects.forEach((project) => {
    const key = project.category?.title ?? "سایر";
    byCategory.set(key, (byCategory.get(key) ?? 0) + (project.budget || 0));
  });

  return {
    total: projects.length,
    open: open.length,
    closed: projects.length - open.length,
    awarded: awarded.length,
    totalBudget: projects.reduce((sum, project) => sum + (project.budget || 0), 0),
    committedBudget: awarded.reduce((sum, project) => sum + (project.budget || 0), 0),
    proposalsReceived,
    averageProposals: projects.length > 0 ? proposalsReceived / projects.length : 0,
    urgent: open.filter((project) => getDeadlineInfo(project.deadline).isUrgent).length,
    budgetByCategory: [...byCategory.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
  };
}

/** Aggregates a freelancer's pipeline for the dashboard hero cards. */
export interface FreelancerStats {
  proposals: number;
  pending: number;
  accepted: number;
  rejected: number;
  totalBid: number;
  wonValue: number;
  winRate: number;
  averageBid: number;
  pipeline: SeriesPoint[];
}

export function buildFreelancerPortfolio(proposals: Proposal[]): FreelancerStats {
  const accepted = proposals.filter((proposal) => proposal.status === 2);
  const decided = proposals.filter((proposal) => proposal.status !== 1);

  return {
    proposals: proposals.length,
    pending: proposals.filter((proposal) => proposal.status === 1).length,
    accepted: accepted.length,
    rejected: proposals.filter((proposal) => proposal.status === 0).length,
    totalBid: proposals.reduce((sum, proposal) => sum + (proposal.price || 0), 0),
    wonValue: accepted.reduce((sum, proposal) => sum + (proposal.price || 0), 0),
    winRate: decided.length > 0 ? accepted.length / decided.length : 0,
    averageBid:
      proposals.length > 0
        ? proposals.reduce((sum, proposal) => sum + (proposal.price || 0), 0) / proposals.length
        : 0,
    pipeline: [
      { label: "proposal.column.pending", value: proposals.filter((p) => p.status === 1).length },
      { label: "proposal.column.accepted", value: accepted.length },
      { label: "proposal.column.rejected", value: proposals.filter((p) => p.status === 0).length },
    ],
  };
}

export function dedupeById<T extends { _id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item._id)) return false;
    seen.add(item._id);
    return true;
  });
}
