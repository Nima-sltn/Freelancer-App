import { useEffect, useState } from "react";
import OTPInput from "react-otp-input";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { IconEdit } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { formatDigits, formatNumber } from "@/lib/format/numbers";
import type { OtpResponse } from "@/types";

const RESEND_SECONDS = 90;

/**
 * Step 2 of sign-in: six-digit code entry with a resend countdown.
 *
 * The countdown is implemented with a single interval that is torn down
 * properly (the previous version created a new interval on every tick), and the
 * API message is surfaced inside a callout so the testing-mode code the backend
 * returns is actually readable by the user.
 */
export function OtpForm({
  phoneNumber,
  isPending,
  otpResponse,
  onVerify,
  onResend,
  onBack,
}: {
  phoneNumber: string;
  isPending: boolean;
  otpResponse?: OtpResponse;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const { t } = useT();
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(id);
  }, [seconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSeconds(RESEND_SECONDS);
  }, [otpResponse?.message]);

  const isComplete = otp.length === 6;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (isComplete) onVerify(otp);
      }}>
      <div className="space-y-1.5 text-center">
        <h2 className="text-lg font-black text-ink">{t("auth.otpTitle")}</h2>
        <p className="text-xs leading-6 text-ink-muted">
          {t("auth.otpSubtitle", { phone: formatDigits(phoneNumber) })}
        </p>
      </div>

      <div className="flex justify-center">
        <OTPInput
          value={otp}
          onChange={setOtp}
          numInputs={6}
          inputType="tel"
          shouldAutoFocus
          renderSeparator={<span aria-hidden="true" className="px-1 text-ink-muted">-</span>}
          renderInput={(props) => (
            <input
              {...props}
              aria-label={t("auth.otpTitle")}
              className="!mx-1 !h-12 !w-11 rounded-lg border border-line bg-surface text-center text-lg font-black text-ink transition-colors focus:border-primary-500 focus:outline-none"
            />
          )}
          containerStyle="flex flex-row-reverse justify-center"
        />
      </div>

      {otpResponse?.message ? (
        <Callout tone="info" title={t("app.demoBadge")}>
          {otpResponse.message}
        </Callout>
      ) : null}

      <div className="flex items-center justify-between text-xs font-bold">
        {seconds > 0 ? (
          <span className="text-ink-muted" aria-live="polite">
            {t("auth.resendIn", { seconds: formatNumber(seconds) })}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSeconds(RESEND_SECONDS);
              onResend();
            }}
            className="text-primary-700 hover:underline">
            {t("auth.resend")}
          </button>
        )}

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-ink-muted hover:text-ink">
          <IconEdit aria-hidden="true" />
          {t("auth.changePhone")}
        </button>
      </div>

      <Button type="submit" fullWidth size="lg" isLoading={isPending} disabled={!isComplete}>
        {t("auth.verify")}
      </Button>
    </form>
  );
}

export default OtpForm;
