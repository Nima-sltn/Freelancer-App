import http from "./httpService";

export function getCategoryApi() {
  return http.get("/category/list").then(({ data }) => data.data);
}
