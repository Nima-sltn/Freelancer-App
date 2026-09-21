import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProjectApi } from "./../../services/projectService";
import toast from "react-hot-toast";
import type { CreateProjectData } from "../../types";

export default function useCreateProject(): {
  isCreating: boolean;
  createProject: (data: CreateProjectData, options?: any) => void;
} {
  const queryclient = useQueryClient();

  const { isPending: isCreating, mutate: createProject } = useMutation({
    mutationFn: createProjectApi,
    onSuccess: (data) => {
      toast.success(data.message);
      queryclient.invalidateQueries({
        queryKey: ["owner-projects"],
      });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message);
    },
  });

  return { isCreating, createProject };
}
