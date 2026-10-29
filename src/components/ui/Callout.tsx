import { useState, type ReactNode } from "react";
import { HiCheck, HiOutlineDuplicate } from "react-icons/hi";
import { copyToClipboard } from "@/lib/export";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";

type CalloutTone = "info" | "success" | "warning" | "danger" | "neutral";

const CALLOUT_TONES: Record<CalloutTone, { wrapper: string; icon: string }> = {
  info: { wrapper: "border-info/30 bg-info/5", icon: "ℹ️" },
  success: { wrapper: "border-success/30 bg-success/5", icon: "✅" },
  warning: { wrapper: "border-warning/40 bg-warning/10", icon: "⚠️" },
  danger: { wrapper: "border-danger/30 bg-danger/5", icon: "⛔" },
  neutral: { wrapper: "border-line bg-surface-sunken", icon: "💡" },
};

export function Callout({
  tone = "neutral",
  title,
  children,
  actions,
  className,
}: Readonly<{
  readonly tone?: CalloutTone;
  readonly title?: ReactNode;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
}>) {
  const config = CALLOUT_TONES[tone];
  return (
    <div
      className={cx("flex items-start gap-3 rounded-lg border p-3.5", config.wrapper, className)}>
      <span aria-hidden="true" className="text-base leading-6">
        {config.icon}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-7 text-ink-soft">
        {title ? <p className="font-bold text-ink">{title}</p> : null}
        {children}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function CopyButton({
  value,
  label,
  className,
}: Readonly<{
  readonly value: string;
  readonly label?: string;
  readonly className?: string;
}>) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const displayLabel = label ?? t("common.copy");

  const handleCopy = async () => {
    const success = await copyToClipboard(value);
    if (!success) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-ink-soft transition-colors hover:bg-surface-sunken",
        className
      )}>
      {copied ? (
        <>
          <HiCheck aria-hidden="true" className="text-success" />
          {t("common.copied")}
        </>
      ) : (
        <>
          <HiOutlineDuplicate aria-hidden="true" />
          {displayLabel}
        </>
      )}
    </button>
  );
}

export default Callout;
