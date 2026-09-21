import { useQuery } from "@tanstack/react-query";
import { getProposalsApi } from "../../services/proposalService";
import type { Proposal } from "../../types";

export default function useProposals(): {
  proposals: Proposal[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: getProposalsApi,
  });

  const { proposals } = data || { proposals: [] };
  return { proposals, isLoading };
}
