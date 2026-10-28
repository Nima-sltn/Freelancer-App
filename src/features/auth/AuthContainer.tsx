import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ROLE_HOME } from "@/config/constants";
import { queryKeys } from "@/config/queryKeys";
import { authService } from "@/services";
import { useT } from "@/store/i18n";
import { ApiError } from "@/lib/http/errors";
import type { OtpResponse, User } from "@/types";
import PhoneForm from "./PhoneForm";
import OtpForm from "./OtpForm";
import DemoAccounts from "./DemoAccounts";

type Step = "phone" | "otp";

/**
 * Sign-in orchestration.
 *
 * Owns the two-step state machine and the post-login routing rules in one place:
 * incomplete profile → complete-profile, unverified → home with an explanation,
 * verified → the role's dashboard. The rules are explicit instead of scattered
 * across two forms (which is how the previous version drifted).
 */
export function AuthContainer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useT();

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpResponse, setOtpResponse] = useState<OtpResponse | undefined>();

  const routeAfterLogin = (user: User | undefined) => {
    if (!user) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });

    if (!user.isActive) {
      navigate("/complete-profile");
      return;
    }
    if (Number(user.status) !== 2) {
      toast.error(t("auth.pendingApproval"), { icon: "⏳" });
      navigate("/");
      return;
    }
    toast.success(t("auth.welcomeBack", { name: user.name }));
    navigate(ROLE_HOME[user.role], { replace: true });
  };

  const { mutate: sendOtp, isPending: isSending } = useMutation({
    mutationFn: authService.getOtp,
    onSuccess: (response, variables) => {
      setPhoneNumber(variables.phoneNumber);
      setOtpResponse(response);
      setStep("otp");
      toast.success(response.message);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : t("common.errorHint"));
    },
  });

  const { mutate: verifyOtp, isPending: isVerifying } = useMutation({
    mutationFn: authService.checkOtp,
    onSuccess: (response) => routeAfterLogin(response.user),
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : t("common.errorHint"));
    },
  });

  return (
    <div className="w-full space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-black text-ink">{t("auth.title")}</h1>
        <p className="text-sm leading-7 text-ink-muted">{t("auth.subtitle")}</p>
      </header>

      {step === "phone" ? (
        <PhoneForm isPending={isSending} onSubmit={(phone) => sendOtp({ phoneNumber: phone })} />
      ) : (
        <OtpForm
          phoneNumber={phoneNumber}
          isPending={isVerifying}
          otpResponse={otpResponse}
          onVerify={(otp) => verifyOtp({ phoneNumber, otp })}
          onResend={() => sendOtp({ phoneNumber })}
          onBack={() => setStep("phone")}
        />
      )}

      <DemoAccounts />
    </div>
  );
}

export default AuthContainer;
