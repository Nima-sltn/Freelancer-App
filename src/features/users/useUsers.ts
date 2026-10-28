import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/config/queryKeys";
import { userService } from "@/services";
import { command, useTransactions } from "@/store/transaction";
import { useT } from "@/store/i18n";
import type { User, UserStatus } from "@/types";

export function useUsers() {
  const query = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: userService.list,
    staleTime: 30_000,
  });

  return {
    users: (query.data?.users ?? []) as User[],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Verification writes — routed through the ACID pipeline like every other write.
 *
 * Moderation used to bypass the transaction manager with a bare `useMutation`,
 * which meant an admin's decision produced no journal entry, no audit trail, no
 * derived notification and no optimistic patch: four domains that disagreed with
 * the fifth. Routing it through `run()` gives verification the same guarantees
 * as the rest of the product — optimistic status flip, rollback on rejection,
 * outbox replay when offline — and one invalidation reconciles the list, the
 * dashboard counters and analytics together.
 */
export function useChangeUserStatus() {
  const { run } = useTransactions();
  const { t } = useT();
  const [isPending, setIsPending] = useState(false);

  const changeStatus = useCallback(
    async (
      variables: { userId: string; status: UserStatus; name?: string },
      options?: { onSettled?: () => void }
    ) => {
      setIsPending(true);
      try {
        const verified = variables.status === 2;
        await run<{ message?: string }>({
          resource: `user:${variables.userId}`,
          labelKey: verified ? "audit.user.verified" : "audit.user.rejected",
          labelParams: { name: variables.name ?? variables.userId },
          patches: [
            {
              queryKey: queryKeys.users.all,
              updater: (current) => patchUserStatus(current, variables.userId, variables.status),
            },
          ],
          command: command("user.changeStatus", {
            userId: variables.userId,
            status: variables.status,
          }),
          request: () => userService.changeStatus(variables.userId, variables.status),
          invalidate: [queryKeys.users.all, queryKeys.projects.all],
          successMessage: verified ? t("users.verifiedToast") : t("users.rejectedToast"),
        });
      } finally {
        setIsPending(false);
        options?.onSettled?.();
      }
    },
    [run, t]
  );

  return { changeStatus, isPending };
}

/** Optimistic patch: flips the status of one user in the cached list. */
function patchUserStatus(current: unknown, userId: string, status: UserStatus): unknown {
  if (!Array.isArray(current)) return current;
  return current.map((user) =>
    (user as User)?._id === userId ? { ...(user as User), status } : user
  );
}

export default useUsers;
