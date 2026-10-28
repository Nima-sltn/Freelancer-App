import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/config/queryKeys";
import { projectService } from "@/services";
import type { Project } from "@/types";

/** Open/closed project feed for freelancers and admins. */
export function useProjects(filters: Record<string, unknown> = {}) {
  const query = useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => projectService.list(filters as never),
    staleTime: 30_000,
  });

  return {
    projects: (query.data?.projects ?? []) as Project[],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/** The signed-in client's own portfolio. */
export function useOwnerProjects(filters: Record<string, unknown> = {}) {
  const query = useQuery({
    queryKey: [...queryKeys.projects.owned, filters],
    queryFn: () => projectService.owned(filters as never),
    staleTime: 30_000,
  });

  return {
    projects: (query.data?.projects ?? []) as Project[],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Single project (detail page). Freelancers may read OPEN projects. */
export function useProject(id: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => projectService.detail(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  });

  return {
    project: query.data?.project as Project | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useProjects;
