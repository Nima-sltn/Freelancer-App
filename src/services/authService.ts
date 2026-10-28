import { http } from "@/lib/http";
import type { AuthResponse, CompleteProfileData, MessageResponse, OtpResponse, User } from "@/types";

/**
 * Authentication endpoints.
 *
 * Every function is a thin, fully typed wrapper: the envelope unwrapping,
 * cookie handling, refresh-token dance and error normalisation all live in
 * `@/lib/http`, so there is nothing to remember here beyond the URL.
 */
export const authService = {
  getOtp: (data: { phoneNumber: string }): Promise<OtpResponse> =>
    http.post<OtpResponse>("/user/get-otp", data),

  checkOtp: (data: { phoneNumber: string; otp: string }): Promise<AuthResponse> =>
    http.post<AuthResponse>("/user/check-otp", data, { _skipAuthRefresh: true }),

  completeProfile: (data: CompleteProfileData): Promise<AuthResponse> =>
    http.post<AuthResponse>("/user/complete-profile", data),

  getProfile: (): Promise<{ user: User }> => http.get<{ user: User }>("/user/profile"),

  updateProfile: (data: Partial<User>): Promise<MessageResponse> =>
    http.patch<MessageResponse>("/user/update", data),

  logout: (): Promise<MessageResponse> => http.post<MessageResponse>("/user/logout"),
};

export const { getOtp, checkOtp, completeProfile, logout } = authService;
export default authService;
