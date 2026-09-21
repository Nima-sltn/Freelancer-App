import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { editProjectApi } from "../../services/projectService";
import type { EditProjectData } from "../../types";

export default function useEditProject(): {
  isEditing: boolean;
  editProject: (
    data: EditProjectData & { id: string },
    options?: any
  ) => void;
} {
  const queryclient = useQueryClient();

  const { isPending: isEditing, mutate: editProject } = useMutation({
    mutationFn: editProjectApi,
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

  return { isEditing, editProject };
}
