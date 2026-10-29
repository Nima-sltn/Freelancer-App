import { cx } from "@/lib/cx";
import { formatNumber } from "@/lib/format/numbers";
import { useT, type TranslationKey } from "@/store/i18n";

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

export interface ProgressBarProps {
  readonly value: number;
  readonly max?: number;
  readonly tone?: Tone;
  readonly label?: string;
  readonly showValue?: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  label,
  showValue = false,
  size = "md",
  className,
}: Readonly<ProgressBarProps>) {
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
      <progress
        value={Math.round(percent)}
        max={100}
        aria-label={label ?? t("common.progress")}
        className={cx(
          "block w-full overflow-hidden rounded-full bg-surface-sunken appearance-none",
          "[&::-webkit-progress-bar]:bg-surface-sunken [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all [&::-moz-progress-bar]:rounded-full",
          heights[size],
          tone === "primary" && "[&::-webkit-progress-value]:bg-primary-600 [&::-moz-progress-bar]:bg-primary-600",
          tone === "success" && "[&::-webkit-progress-value]:bg-success [&::-moz-progress-bar]:bg-success",
          tone === "warning" && "[&::-webkit-progress-value]:bg-warning [&::-moz-progress-bar]:bg-warning",
          tone === "danger" && "[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger",
          tone === "info" && "[&::-webkit-progress-value]:bg-info [&::-moz-progress-bar]:bg-info"
        )}>
        {Math.round(percent)}%
      </progress>
    </div>
  );
}

export interface ProgressRingProps {
  readonly value: number;
  readonly max?: number;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly tone?: Tone;
  readonly children?: React.ReactNode;
  readonly label?: string;
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
}: Readonly<ProgressRingProps>) {
  const { t } = useT();
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;
  const accessibleLabel = label ?? t("common.scoreOutOf", {
    score: formatNumber(Math.round(percent)),
    max: formatNumber(100),
  });

  return (
    <div className="relative inline-grid place-items-center">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-label={accessibleLabel}>
        <title>{accessibleLabel}</title>
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

function getScoreTone(score: number): Tone {
  if (score >= 80) return "success";
  if (score >= 60) return "info";
  if (score >= 40) return "warning";
  return "danger";
}

function getScoreTierKey(score: number): TranslationKey {
  if (score >= 80) return "matching.tier.excellent";
  if (score >= 60) return "matching.tier.good";
  if (score >= 40) return "matching.tier.fair";
  return "matching.tier.weak";
}

export interface ScoreMeterProps {
  readonly score: number;
  readonly size?: "sm" | "md";
  readonly showLabel?: boolean;
}

/** 0–100 score with a tone derived from the value, used by AI match scoring. */
export function ScoreMeter({
  score,
  size = "md",
  showLabel = true,
}: Readonly<ScoreMeterProps>) {
  const { t } = useT();
  const tone: Tone = getScoreTone(score);
  const label = t(getScoreTierKey(score));

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

export interface RatingStarsProps {
  readonly value: number;
  readonly count?: number;
  readonly size?: "sm" | "md";
}

export function RatingStars({
  value,
  count,
  size = "md",
}: Readonly<RatingStarsProps>) {
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
