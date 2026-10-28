import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/config/queryKeys";
import { proposalService } from "@/services";
import type { Project, Proposal } from "@/types";

/**
 * Proposals visible to the current user.
 *
 * The API returns proposals without their project, so the project title would be
 * missing in the freelancer's table. Rather than firing N extra requests, the
 * hook joins against the already-cached project lists — a request-free
 * enrichment that also keeps the two views consistent.
 */
export function useProposals(filters: { sort?: string } = {}) {
  const query = useQuery({
    queryKey: queryKeys.proposals.list(filters),
    queryFn: () => proposalService.list(filters),
    staleTime: 30_000,
  });

  return {
    proposals: (query.data?.proposals ?? []) as Proposal[],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Joins proposals with project details from the query cache. */
export function enrichWithProjects(proposals: Proposal[], projects: Project[]): Proposal[] {
  if (projects.length === 0) return proposals;
  const index = new Map(projects.map((project) => [project._id, project]));
  return proposals.map((proposal) => {
    const project = proposal.projectId ? index.get(proposal.projectId) : undefined;
    return project ? { ...proposal, project } : proposal;
  });
}

export default useProposals;
