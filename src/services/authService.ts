import http from "./httpService";
import type { User, OtpResponse, AuthResponse } from "../types";

export function getOtp(data: { phoneNumber: string }): Promise<OtpResponse> {
  return http.post("/user/get-otp", data).then(({ data }) => data.data);
}

export function checkOtp(data: {
  phoneNumber: string;
  otp: string;
}): Promise<AuthResponse> {
  return http.post("/user/check-otp", data).then(({ data }) => data.data);
}

export function completeProfile(data: {
  name: string;
  email: string;
  role: string;
}): Promise<AuthResponse> {
  return http
    .post("/user/complete-profile", data)
    .then(({ data }) => data.data);
}

export function getUser(): Promise<{ user: User }> {
  return http.get("/user/profile").then(({ data }) => data.data);
}

export function logoutApi(): Promise<{ message: string }> {
  return http.post("/user/logout").then(({ data }) => data.data);
}

export function getUsersApi(): Promise<{ users: User[] }> {
  return http.get("/admin/user/list").then(({ data }) => data.data);
}

export function changeUserStatusApi({
  userId,
  data,
}: {
  userId: string;
  data: { status: number };
}): Promise<{ message: string }> {
  return http
    .patch(`/admin/user/verify/${userId}`, data)
    .then(({ data }) => data.data);
}
