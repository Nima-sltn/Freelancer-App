import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/config/queryKeys";
import { authService } from "@/services";
import type { User } from "@/types";

export interface SessionState {
  user: User | undefined;
  isLoading: boolean;
  isError: boolean;
  /** True only when the API returned a real user document. */
  isAuthenticated: boolean;
  isVerified: boolean;
  refetch: () => void;
}

/**
 * Current session.
 *
 * The previous implementation returned `{} as User` when the query had no data,
 * which is a truthy object — so an anonymous visitor was treated as signed in
 * and every guarded page rendered before failing on the first API call. The
 * predicate now requires a real `_id`.
 */
export function useUser(): SessionState {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: authService.getProfile,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const user = data?.user;

  return {
    user,
    isLoading,
    isError,
    isAuthenticated: Boolean(user?._id),
    isVerified: Boolean(user?.isActive) && Number(user?.status) === 2,
    refetch: () => {
      void refetch();
    },
  };
}

export default useUser;
