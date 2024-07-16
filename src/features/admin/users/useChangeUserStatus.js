import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { changeUserStatusApi } from "../../../services/authService";

export default function useChangeUserStatus() {
  const { isPending: isUpdating, mutate: changeUserStatus } = useMutation({
    mutationFn: changeUserStatusApi,
    onSuccess: (data) => {
      toast.success(data.message);
    },

    onError: (err) => {
      toast.error(err?.response?.data?.message);
    },
  });

  return { isUpdating, changeUserStatus };
}
