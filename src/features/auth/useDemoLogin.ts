import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { env } from "@/config/env";
import { ROLE_HOME } from "@/config/constants";
import { authService } from "@/services";
import { DEMO_OTP_CODE } from "@/mocks/data";
import { queryKeys } from "@/config/queryKeys";
import { useT } from "@/store/i18n";

/**
 * One-click sign-in for the seeded demo accounts.
 *
 * It drives the **real** OTP flow (`get-otp` → `check-otp`) instead of writing
 * to the session store directly, so the demo exercises exactly the code path a
 * production login takes. Only rendered when `VITE_API_MODE=mock`.
 */
export function useDemoLogin() {
  const { t } = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: loginAs, isPending, variables } = useMutation({
    mutationFn: async (phoneNumber: string) => {
      await authService.getOtp({ phoneNumber });
      return authService.checkOtp({ phoneNumber, otp: DEMO_OTP_CODE });
    },
    onSuccess: (result) => {
      const user = result.user;
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
      toast.success(result.message);

      if (!user.isActive) {
        navigate("/complete-profile");
        return;
      }
      if (Number(user.status) !== 2) {
        toast.error(t("auth.pendingApprovalToast"), { icon: "⏳" });
        navigate("/");
        return;
      }
      navigate(ROLE_HOME[user.role], { replace: true });
    },
    onError: () => {
      toast.error(t("auth.demoLoginFailed"));
    },
  });

  return {
    loginAs: (phoneNumber: string) => loginAs(phoneNumber),
    isPending,
    activePhone: variables,
    enabled: env.useMocks,
  };
}

export default useDemoLogin;
