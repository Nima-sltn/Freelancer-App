import { http } from "@/lib/http";
import type { CreateProposalData, MessageResponse, Proposal, ProposalStatus } from "@/types";

/** Proposal endpoints (submit, list, change review status). */
export const proposalService = {
  list: (filters: { sort?: string } = {}): Promise<{ proposals: Proposal[] }> =>
    http.get<{ proposals: Proposal[] }>("/proposal/list", { params: filters }),

  detail: (id: string): Promise<{ proposal: Proposal }> =>
    http.get<{ proposal: Proposal }>(`/proposal/${id}`),

  create: (data: CreateProposalData): Promise<{ message: string; proposal?: Proposal }> =>
    http.post<{ message: string; proposal?: Proposal }>("/proposal/add", data),

  changeStatus: (payload: {
    proposalId: string;
    projectId: string;
    status: ProposalStatus;
  }): Promise<MessageResponse> => {
    const { proposalId, projectId, status } = payload;
    return http.patch<MessageResponse>(`/proposal/${proposalId}`, { projectId, status });
  },
};

export default proposalService;
