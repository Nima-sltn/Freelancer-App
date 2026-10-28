import { http } from "@/lib/http";
import type { Category, MessageResponse } from "@/types";

/** Category endpoints, including the admin CRUD surface. */
export const categoryService = {
  list: (): Promise<{ categories: Category[] }> =>
    http.get<{ categories: Category[] }>("/category/list"),

  detail: (id: string): Promise<{ category: Category }> =>
    http.get<{ category: Category }>(`/category/${id}`),

  create: (data: Pick<Category, "title" | "englishTitle">): Promise<MessageResponse> =>
    http.post<MessageResponse>("/admin/category/add", data),

  update: (id: string, data: Partial<Category>): Promise<MessageResponse> =>
    http.patch<MessageResponse>(`/admin/category/update/${id}`, data),

  remove: (id: string): Promise<MessageResponse> =>
    http.delete<MessageResponse>(`/admin/category/remove/${id}`),
};

export default categoryService;
