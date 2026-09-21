import http from "./httpService";
import type { Project, CreateProjectData, EditProjectData } from "../types";

export function getOwnerProjectsApi(): Promise<{ projects: Project[] }> {
  return http.get("/project/owner-projects").then(({ data }) => data.data);
}

export function removeProjectApi(
  id: string
): Promise<{ message: string }> {
  return http.delete(`/project/${id}`).then(({ data }) => data.data);
}

export function createProjectApi(
  data: CreateProjectData
): Promise<{ message: string }> {
  return http.post(`/project/add`, data).then(({ data }) => data.data);
}

export function editProjectApi({
  id,
  newProject,
}: EditProjectData & { id: string }): Promise<{ message: string }> {
  return http
    .patch(`/project/update/${id}`, newProject)
    .then(({ data }) => data.data);
}

export function toggleProjectStatusApi({
  id,
  data,
}: {
  id: string;
  data: { status: string };
}): Promise<{ message: string }> {
  return http.patch(`/project/${id}`, data).then(({ data }) => data.data);
}

export function getProjectApi(
  id: string | undefined
): Promise<{ project: Project }> {
  return http.get(`/project/${id}`).then(({ data }) => data.data);
}

export function getProjectsApi(
  qs: string
): Promise<{ projects: Project[] }> {
  return http.get(`/project/list${qs}`).then(({ data }) => data.data);
}
