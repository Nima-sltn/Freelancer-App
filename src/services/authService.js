import http from "./httpService";

export function getOtp(data) {
  return http.post("/user/get-otp", data).then(({ data }) => data.data);
}

export function checkOtp(data) {
  return http.post("/user/check-otp", data);
}
