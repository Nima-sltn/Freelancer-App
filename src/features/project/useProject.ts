import { useQuery } from "@tanstack/react-query";
import { getProjectApi } from "../../services/projectService";
import { useParams } from "react-router-dom";
import type { Project } from "../../types";

export default function useProject(): {
  isLoading: boolean;
  project: Project;
} {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProjectApi(id),
    retry: false,
  });

  const { project } = data || { project: {} as Project };

  return { isLoading, project };
}
