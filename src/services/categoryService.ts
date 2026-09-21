import http from "./httpService";
import type { Category } from "../types";

export function getCategoryApi(): Promise<{ categories: Category[] }> {
  return http.get("/category/list").then(({ data }) => data.data);
}
