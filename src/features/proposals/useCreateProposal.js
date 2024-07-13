import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createProposalApi } from "../../services/proposalService";

export default function useCreateProposal() {
  const queryclient = useQueryClient();

  const { isPending: isCreating, mutate: createProposal } = useMutation({
    mutationFn: createProposalApi,
    onSuccess: (data) => {
      toast.success(data.message);
      queryclient.invalidateQueries({
        queryKey: ["proposals"],
      });
    },

    onError: (err) => {
      toast.error(err?.response?.data?.message);
    },
  });

  return { isCreating, createProposal };
}
