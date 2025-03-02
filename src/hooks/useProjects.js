import { useQuery } from "@tanstack/react-query";
import { getProjectsApi } from "../services/projectService";
import { useLocation } from "react-router-dom";

export default function useProjects() {
  const { search } = useLocation();

  const queryObject = Object.fromEntries(new URLSearchParams(search));

  const { data, isLoading } = useQuery({
    queryKey: ["projects", queryObject],
    queryFn: () => getProjectsApi(search),
  });

  const { projects } = data || {};

  return { isLoading, projects };
}
