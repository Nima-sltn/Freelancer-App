import { http } from "@/lib/http";
import type { MessageResponse, User, UserStatus } from "@/types";

/** Admin-only user management. */
export const userService = {
  list: (): Promise<{ users: User[] }> => http.get<{ users: User[] }>("/admin/user/list"),

  detail: (userId: string): Promise<{ user: User }> =>
    http.get<{ user: User }>(`/admin/user/profile/${userId}`),

  changeStatus: (userId: string, status: UserStatus): Promise<MessageResponse> =>
    http.patch<MessageResponse>(`/admin/user/verify/${userId}`, { status }),
};

export default userService;
