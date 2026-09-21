import { useQuery } from "@tanstack/react-query";
import { getCategoryApi } from "./../services/categoryService";
import type { CategoryOption } from "../types";

export default function useCategories(): {
  isLoading: boolean;
  categories: CategoryOption[];
  transformedCategories: CategoryOption[];
} {
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategoryApi,
  });

  const { categories: rawCategories = [] } = data || { categories: [] };

  const categories = rawCategories.map((item) => ({
    label: item.title,
    value: item._id,
  }));

  const transformedCategories = rawCategories.map((item) => ({
    label: item.title,
    value: item.englishTitle,
  }));

  return { isLoading, categories, transformedCategories };
}
