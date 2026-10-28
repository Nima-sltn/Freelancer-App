import type { ReactNode } from "react";
import { HiArrowDown, HiArrowUp } from "react-icons/hi";
import { formatNumber } from "@/lib/format/numbers";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";

type StatTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

export function StatCard({
  title,
  value,
  icon,
  tone = "neutral",
  hint,
  delta,
  footer,
  isLoading,
  className,
}: {
  title: string;
  value: number | string;
  icon?: ReactNode;
  tone?: StatTone;
  hint?: string;
  /** Percentage change vs the previous period; sign drives the arrow. */
  delta?: number;
  footer?: ReactNode;
  isLoading?: boolean;
  className?: string;
}) {
  const { t, locale } = useT();
  const formatted = typeof value === "number" ? formatNumber(value) : value;

  return (
    <article
      className={cx(
        "group relative flex items-start justify-between gap-4 rounded-2xl border border-line/70 bg-surface p-5 shadow-sm transition-all duration-200 hover:border-line hover:shadow-md",
        className
      )}>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {title}
        </h3>
        {isLoading ? (
          <div className="skeleton mt-3 h-8 w-28 rounded-lg" />
        ) : (
          <p className="mt-2 text-2xl font-black tracking-tight text-ink tabular-nums sm:text-3xl">
            {formatted}
          </p>
        )}
        {hint ? <p className="mt-1.5 text-xs text-ink-muted">{hint}</p> : null}
        {delta !== undefined ? (
          <p
            className={cx(
              "mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-bold",
              delta >= 0
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            )}>
            {delta >= 0 ? <HiArrowUp className="h-3 w-3" aria-hidden="true" /> : <HiArrowDown className="h-3 w-3" aria-hidden="true" />}
            <span>{formatNumber(Math.abs(delta))}{locale === "fa" ? "٪" : "%"}</span>
            <span className="font-normal opacity-80">{t("stats.vsPrevious")}</span>
          </p>
        ) : null}
        {footer ? <div className="mt-4 border-t border-line/50 pt-3">{footer}</div> : null}
      </div>

      {icon ? (
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line/60 bg-surface-sunken/80 text-ink-soft transition-colors duration-200 group-hover:bg-surface-sunken group-hover:text-ink">
          {icon}
        </span>
      ) : null}
    </article>
  );
}

export default StatCard;
