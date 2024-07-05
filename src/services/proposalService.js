import http from "./httpService";

export function changeProposalStatusApi({ id, data }) {
  return http.patch(`/proposal/${id}`, data).then(({ data }) => data.data);
}

export function getProposalsApi() {
  return http.get(`/proposal/list`).then(({ data }) => data.data);
}
