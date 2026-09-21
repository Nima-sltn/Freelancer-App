import { useQuery } from "@tanstack/react-query";
import { getProjectsApi } from "../services/projectService";
import { useLocation } from "react-router-dom";
import type { Project } from "../types";

export default function useProjects(): {
  isLoading: boolean;
  projects: Project[];
} {
  const { search } = useLocation();

  const queryObject = Object.fromEntries(new URLSearchParams(search));

  const { data, isLoading } = useQuery({
    queryKey: ["projects", queryObject],
    queryFn: () => getProjectsApi(search),
  });

  const { projects } = data || { projects: [] };

  return { isLoading, projects };
}
