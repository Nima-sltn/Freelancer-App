import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { changeProposalStatusApi } from "./../../services/proposalService";

export default function useChangeProposalStatus(): {
  isUpdating: boolean;
  changeProposalStatus: (data: { proposalId: string; projectId: string; status: number }, options?: any) => void;
} {
  const { isPending: isUpdating, mutate: changeProposalStatus } = useMutation({
    mutationFn: changeProposalStatusApi,
    onSuccess: (data) => {
      toast.success(data.message);
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message);
    },
  });

  return { isUpdating, changeProposalStatus };
}
