import { useMemo } from "react";
import { buildAnalyticsSnapshot, buildInsights } from "@/entities/analytics/overview";
import { buildFreelancerPortfolio, buildOwnerPortfolio } from "@/entities/project/metrics";
import { rankProjectsForUser } from "@/entities/proposal/matching";
import { buildTrustProfile, computeExperience, buildLeaderboard } from "@/entities/user/trust";
import { useCategories } from "@/features/categories/useCategories";
import { useProjects, useOwnerProjects } from "@/features/projects/useProjects";
import { useProposals } from "@/features/proposals/useProposals";
import { useUsers } from "@/features/users/useUsers";
import type { Project, Proposal, User } from "@/types";

/**
 * Single source of derived dashboard data.
 *
 * Every widget on the dashboards reads from this hook, which is why the numbers
 * are consistent across cards, charts and the analytics page. Loading the raw
 * queries once and deriving everything with pure functions keeps the dashboards
 * to a single network round-trip per resource.
 */
export interface DashboardData {
  projects: Project[];
  publishedProjects: Project[];
  ownedProjects: Project[];
  proposals: Proposal[];
  users: User[];
  snapshot: ReturnType<typeof buildAnalyticsSnapshot>;
  insights: ReturnType<typeof buildInsights>;
  owner: ReturnType<typeof buildOwnerPortfolio>;
  freelancer: ReturnType<typeof buildFreelancerPortfolio>;
  recommendations: ReturnType<typeof rankProjectsForUser>;
  trust: ReturnType<typeof buildTrustProfile> | undefined;
  experience: ReturnType<typeof computeExperience> | undefined;
  leaderboard: ReturnType<typeof buildLeaderboard>;
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => void;
}

export function useDashboardData(user: User | undefined, role: User["role"] | undefined): DashboardData {
  const isAdmin = role === "ADMIN";
  const isOwner = role === "OWNER";
  const isFreelancer = role === "FREELANCER";

  const published = useProjects(isFreelancer ? { status: "OPEN" } : {});
  const owned = useOwnerProjects({});
  const proposalsQuery = useProposals({ sort: "latest" });
  const usersQuery = useUsers();
  const categories = useCategories();

  const projects = useMemo(() => {
    if (isAdmin) return published.projects;
    if (isOwner) return owned.projects.length > 0 ? owned.projects : published.projects;
    return published.projects;
  }, [isAdmin, isOwner, owned.projects, published.projects]);

  const proposals = proposalsQuery.proposals;

  // Admins see every proposal; freelancers already receive only their own.
  const scopedProposals = isOwner
    ? proposals.filter((proposal) =>
        projects.some((project) => project._id === proposal.projectId)
      )
    : proposals;

  const snapshot = useMemo(
    () =>
      buildAnalyticsSnapshot({
        projects,
        proposals: isFreelancer ? scopedProposals : proposals,
        users: isAdmin ? usersQuery.users : [],
        categories: categories.categories,
      }),
    [categories.categories, isAdmin, isFreelancer, projects, proposals, scopedProposals, usersQuery.users]
  );

  const insights = useMemo(
    () => buildInsights(snapshot, projects, categories.categories),
    [snapshot, projects, categories.categories]
  );

  const ownerStats = useMemo(() => buildOwnerPortfolio(projects), [projects]);
  const freelancerStats = useMemo(() => buildFreelancerPortfolio(proposals), [proposals]);

  const recommendations = useMemo(
    () =>
      user && isFreelancer
        ? rankProjectsForUser(published.projects, { user }, 6)
        : [],
    [isFreelancer, published.projects, user]
  );

  const trust = useMemo(() => (user ? buildTrustProfile(user) : undefined), [user]);
  const experience = useMemo(
    () => (user ? computeExperience(user, proposals) : undefined),
    [proposals, user]
  );
  const leaderboard = useMemo(
    () => (isFreelancer ? buildLeaderboard(user ? [user, ...usersQuery.users] : usersQuery.users, proposals) : []),
    [isFreelancer, proposals, user, usersQuery.users]
  );

  const refetchAll = () => {
    void published.refetch();
    void owned.refetch();
    void proposalsQuery.refetch();
    if (isAdmin) void usersQuery.refetch();
  };

  return {
    projects,
    publishedProjects: published.projects,
    ownedProjects: owned.projects,
    proposals,
    users: usersQuery.users,
    snapshot,
    insights,
    owner: ownerStats,
    freelancer: freelancerStats,
    recommendations,
    trust,
    experience,
    leaderboard,
    isLoading:
      published.isLoading ||
      proposalsQuery.isLoading ||
      (isAdmin && usersQuery.isLoading) ||
      (isOwner && owned.isLoading),
    isError: Boolean(published.error || proposalsQuery.error),
    refetchAll,
  };
}

export default useDashboardData;
