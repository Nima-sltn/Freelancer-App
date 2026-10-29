import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/config/queryKeys";
import { categoryService } from "@/services";
import { useT } from "@/store/i18n";
import { ApiError } from "@/lib/http/errors";
import type { Category, CategoryOption } from "@/types";
import toast from "react-hot-toast";

export interface CategoriesState {
  categories: Category[];
  /** Options keyed by Mongo id (used by forms). */
  options: CategoryOption[];
  /** Options keyed by `englishTitle` (used by the API's list filters). */
  filterOptions: CategoryOption[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function useCategories(): CategoriesState {
  const { locale } = useT();
  const query = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: categoryService.list,
    staleTime: 10 * 60 * 1000,
  });

  const categories = (query.data?.categories ?? []) as Category[];
  const isEn = locale === "en";

  return {
    categories,
    options: categories.map((category) => ({
      label: isEn ? (category.englishTitle || category.title) : category.title,
      value: category._id,
    })),
    filterOptions: categories.map((category) => ({
      label: isEn ? (category.englishTitle || category.title) : category.title,
      value: category.englishTitle,
    })),
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => {
      query.refetch();
    },
  };
}

/** Admin CRUD for categories. */
export function useCategoryMutations() {
  const queryClient = useQueryClient();
  const { t } = useT();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
  };

  const create = useMutation({
    mutationFn: (data: Pick<Category, "title" | "englishTitle">) => categoryService.create(data),
    onSuccess: (data) => {
      toast.success(data.message);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t("common.errorHint")),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoryService.update(id, data),
    onSuccess: (data) => {
      toast.success(data.message);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t("common.errorHint")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => categoryService.remove(id),
    onSuccess: (data) => {
      toast.success(data.message);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : t("common.errorHint")),
  });

  return { create, update, remove };
}

export default useCategories;
