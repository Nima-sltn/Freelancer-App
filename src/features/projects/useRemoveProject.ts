import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeProjectApi } from "../../services/projectService";
import toast from "react-hot-toast";

export default function useRemoveProject(): {
  removeProject: (id: string, options?: any) => void;
  isDeleting: boolean;
} {
  const queryclient = useQueryClient();

  const { mutate: removeProject, isPending: isDeleting } = useMutation({
    mutationFn: removeProjectApi,
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
  return { removeProject, isDeleting };
}
