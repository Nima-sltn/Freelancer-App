import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { editProjectApi } from "../../services/projectService";

export default function useEditProject() {
  const queryclient = useQueryClient();

  const { isPending: isEditing, mutate: editProject } = useMutation({
    mutationFn: editProjectApi,
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

  return { isEditing, editProject };
}
