import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProjectApi } from "./../../services/projectService";
import toast from "react-hot-toast";

export default function useCreateProject() {
  const queryclient = useQueryClient();

  const { isPending: isCreating, mutate: createPoject } = useMutation({
    mutationFn: createProjectApi,
    onSuccess: (data) => {
      toast.success(data.message);
      queryclient.invalidateQueries({
        queryKey: ["owner-projects"],
      });
    },

    onError: (err) => {
      toast.error(err?.response?.data?.message);
    },
  });

  return { isCreating, createPoject };
}
