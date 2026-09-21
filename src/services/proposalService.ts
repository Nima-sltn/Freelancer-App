import http from "./httpService";
import type { Proposal } from "../types";

export function changeProposalStatusApi({
  proposalId,
  projectId,
  ...rest
}: {
  proposalId: string;
  projectId: string;
  status: number;
}): Promise<{ message: string }> {
  return http
    .patch(`/proposal/${proposalId}`, { projectId, ...rest })
    .then(({ data }) => data.data);
}

export function getProposalsApi(): Promise<{ proposals: Proposal[] }> {
  return http.get(`/proposal/list`).then(({ data }) => data.data);
}

export function createProposalApi(data: {
  description: string;
  price: number;
  duration: number;
  projectId: string;
}): Promise<{ message: string }> {
  return http.post(`/proposal/add`, data).then(({ data }) => data.data);
}
