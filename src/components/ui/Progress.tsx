import { cx } from "@/lib/cx";
import { formatNumber } from "@/lib/format/numbers";
import { useT } from "@/store/i18n";

type Tone = "primary" | "success" | "warning" | "danger" | "info";

const BAR_TONES: Record<Tone, string> = {
  primary: "bg-primary-600",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

const STROKE_TONES: Record<Tone, string> = {
  primary: "stroke-primary-600",
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-danger",
  info: "stroke-info",
};

export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  label,
  showValue = false,
  size = "md",
  className,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t, locale } = useT();
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const heights = { sm: "h-1", md: "h-2", lg: "h-3" } as const;

  return (
    <div className={cx("w-full", className)}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-ink-muted">
          {label ? <span>{label}</span> : <span />}
          {showValue ? <span>{formatNumber(Math.round(percent))}{locale === "fa" ? "٪" : "%"}</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? t("common.progress")}
        className={cx("w-full overflow-hidden rounded-full bg-surface-sunken", heights[size])}>
        <div
          className={cx("h-full rounded-full transition-all duration-500 ease-spring", BAR_TONES[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Compact animated ring, used for match scores and completion meters. */
export function ProgressRing({
  value,
  max = 100,
  size = 88,
  strokeWidth = 8,
  tone = "primary",
  children,
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  tone?: Tone;
  children?: React.ReactNode;
  label?: string;
}) {
  const { t } = useT();
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div
      className="relative inline-grid place-items-center"
      role="img"
      aria-label={label ?? t("common.scoreOutOf", { score: formatNumber(Math.round(percent)), max: formatNumber(100) })}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-sunken"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className={cx("transition-all duration-700 ease-spring", STROKE_TONES[tone])}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** 0–100 score with a tone derived from the value, used by AI match scoring. */
export function ScoreMeter({
  score,
  size = "md",
  showLabel = true,
}: {
  score: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const { t } = useT();
  const tone: Tone = score >= 80 ? "success" : score >= 60 ? "info" : score >= 40 ? "warning" : "danger";
  const label =
    score >= 80
      ? t("matching.tier.excellent")
      : score >= 60
        ? t("matching.tier.good")
        : score >= 40
          ? t("matching.tier.fair")
          : t("matching.tier.weak");

  return (
    <div className={cx("flex items-center gap-2", size === "sm" && "gap-1.5")}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
        <div
          className={cx("h-full rounded-full", BAR_TONES[tone])}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span
        className={cx(
          "font-black tabular-nums",
          size === "sm" ? "text-xs" : "text-sm",
          tone === "success" && "text-success",
          tone === "info" && "text-info",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger"
        )}>
        {formatNumber(Math.round(score))}
      </span>
      {showLabel ? <span className="text-xs text-ink-muted">{label}</span> : null}
    </div>
  );
}

export function RatingStars({
  value,
  count,
  size = "md",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const { t } = useT();
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1" aria-label={t("common.scoreOutOf", { score: formatNumber(value), max: formatNumber(5) })}>
      <span aria-hidden="true" className={cx(size === "sm" ? "text-xs" : "text-sm", "text-warning")}>
        {"★".repeat(rounded)}
        <span className="text-line-strong">{"★".repeat(Math.max(0, 5 - rounded))}</span>
      </span>
      <span className="text-xs font-bold text-ink-soft tabular-nums">{value.toFixed(1)}</span>
      {count !== undefined ? <span className="text-xs text-ink-muted">({formatNumber(count)})</span> : null}
    </span>
  );
}

export default ProgressBar;
