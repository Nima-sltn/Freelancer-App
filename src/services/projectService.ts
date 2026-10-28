import { http } from "@/lib/http";
import type {
  CreateProjectData,
  MessageResponse,
  Project,
  ProjectFilters,
} from "@/types";

/**
 * Project endpoints. Filter objects are serialised once by the axios client
 * (`arrays` become comma-joined query params, which is what the Express
 * controllers parse) instead of hand-built query strings at the call site.
 */
export const projectService = {
  list: (filters: ProjectFilters = {}): Promise<{ projects: Project[] }> =>
    http.get<{ projects: Project[] }>("/project/list", { params: filters }),

  owned: (filters: ProjectFilters = {}): Promise<{ projects: Project[] }> =>
    http.get<{ projects: Project[] }>("/project/owner-projects", { params: filters }),

  detail: (id: string): Promise<{ project: Project }> =>
    http.get<{ project: Project }>(`/project/${id}`),

  create: (data: CreateProjectData): Promise<{ message: string; project: Project }> =>
    http.post<{ message: string; project: Project }>("/project/add", data),

  update: (id: string, data: CreateProjectData): Promise<MessageResponse> =>
    http.patch<MessageResponse>(`/project/update/${id}`, data),

  changeStatus: (id: string, status: "OPEN" | "CLOSED"): Promise<MessageResponse> =>
    http.patch<MessageResponse>(`/project/${id}`, { status }),

  remove: (id: string): Promise<MessageResponse> => http.delete<MessageResponse>(`/project/${id}`),
};

export default projectService;
