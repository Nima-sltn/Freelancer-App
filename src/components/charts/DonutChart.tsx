import { useMemo, useState } from "react";
import type { DistributionSlice } from "@/types";
import { formatNumber, formatPercent } from "@/lib/format/numbers";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";
import { pickColor } from "./utils";

export interface DonutChartProps {
  readonly data: readonly DistributionSlice[];
  readonly size?: number;
  readonly thickness?: number;
  readonly centerLabel?: string;
  readonly className?: string;
}

/** Donut chart with an interactive legend; arcs are plain SVG stroke dashes. */
export function DonutChart({
  data,
  size = 190,
  thickness = 22,
  centerLabel,
  className,
}: Readonly<DonutChartProps>) {
  const { t } = useT();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = useMemo(() => data.reduce((sum, slice) => sum + slice.value, 0), [data]);

  if (total === 0 || data.length === 0) {
    return (
      <p className="grid h-48 place-items-center text-sm text-ink-muted">{t("charts.empty")}</p>
    );
  }

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const arcs = data.map((slice, index) => {
    const fraction = slice.value / total;
    const length = fraction * circumference;
    const arc = {
      ...slice,
      fraction,
      length,
      offset,
      color: slice.color ?? pickColor(index),
    };
    offset += length;
    return arc;
  });

  const active = activeIndex !== null ? arcs[activeIndex] : null;

  return (
    <div className={cx("flex flex-col items-center gap-5 sm:flex-row sm:items-center", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-label={t("charts.donutLabel")}>
          <title>{t("charts.donutLabel")}</title>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            stroke="rgb(var(--color-surface-sunken))"
          />
          {arcs.map((arc, index) => (
            <circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={activeIndex === index ? thickness + 4 : thickness}
              stroke={arc.color}
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-300"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <p className="text-2xl font-black text-ink tabular-nums">
            {active ? formatNumber(active.value) : formatNumber(total)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {active ? active.label : (centerLabel ?? t("charts.total"))}
          </p>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {arcs.map((arc, index) => (
          <li key={arc.label}>
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              className={cx(
                "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-start transition-colors",
                activeIndex === index ? "bg-surface-sunken" : "hover:bg-surface-sunken/60"
              )}>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: arc.color }}
                />
                <span className="truncate text-xs font-bold text-ink-soft">{arc.label}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-ink-muted tabular-nums">
                {formatPercent(arc.fraction)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DonutChart;
