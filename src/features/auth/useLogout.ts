import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authService } from "@/services";
import { useT } from "@/store/i18n";
import { clearJournal } from "@/store/transaction";

/** Signs the user out, clears every cached query and navigates to the auth page. */
export function useLogout(): { logout: () => void; isPending: boolean } {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useT();

  const { mutate: logout, isPending } = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      // `clear()` also drops the optimistic journal so the next session starts clean.
      queryClient.clear();
      clearJournal();
      navigate("/auth", { replace: true });
    },
    onError: () => {
      toast.error(t("common.errorHint"));
    },
  });

  return { logout: () => logout(), isPending };
}

export default useLogout;
