import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { toggleProjectStatusApi } from "../../services/projectService";

export default function useToggleProjectStatus() {
  const queryclient = useQueryClient();

  const { isPending: isUpdating, mutate: toggleProjectStatus } = useMutation({
    mutationFn: toggleProjectStatusApi,
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

  return { isUpdating, toggleProjectStatus };
}
