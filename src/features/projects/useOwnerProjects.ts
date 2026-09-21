import { useQuery } from "@tanstack/react-query";
import { getOwnerProjectsApi } from "../../services/projectService";
import type { Project } from "../../types";

export default function useOwnerProjects(): {
  isLoading: boolean;
  projects: Project[];
} {
  const { data, isLoading } = useQuery({
    queryKey: ["owner-projects"],
    queryFn: getOwnerProjectsApi,
  });

  const { projects } = data || { projects: [] };

  return { isLoading, projects };
}
