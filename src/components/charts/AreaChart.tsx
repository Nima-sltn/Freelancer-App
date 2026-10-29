import { useId, useMemo, useState } from "react";
import type { SeriesPoint } from "@/types";
import { formatNumber } from "@/lib/format/numbers";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";
import { buildAreaPath, buildSmoothPath, createScale, maxOf, niceCeil, toPoints } from "./utils";

export interface AreaChartProps {
  readonly data: readonly SeriesPoint[];
  readonly height?: number;
  readonly color?: string;
  readonly secondaryColor?: string;
  /** Formats tooltip values (e.g. currency). */
  readonly valueFormatter?: (value: number) => string;
  readonly showSecondary?: boolean;
  readonly className?: string;
}

const PADDING = { top: 16, right: 16, bottom: 28, left: 44 };

/**
 * Responsive area chart drawn with hand-rolled SVG.
 *
 * Why not a charting library: the product needs four chart shapes, a strict
 * token-based theme, RTL text and an accessible data fallback — that is less
 * code than configuring and theming a library, and it adds zero kilobytes to
 * the bundle. The viewBox scales to the container, so no resize observer is
 * needed either.
 */
export function AreaChart({
  data,
  height = 240,
  color = "rgb(var(--color-primary-600))",
  secondaryColor = "rgb(var(--color-success))",
  valueFormatter = (value) => formatNumber(value),
  showSecondary = false,
  className,
}: Readonly<AreaChartProps>) {
  const { t } = useT();
  const gradientId = useId().replace(/:/g, "");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const width = 720;
  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const { points, max, scaleX, areaPath, linePath, secondaryPath } = useMemo(() => {
      const dataMax = niceCeil(maxOf(data));
      const yScale = createScale(0, dataMax, PADDING.top + innerHeight, PADDING.top);
      const step = data.length > 1 ? innerWidth / (data.length - 1) : 0;
      const xScale = (index: number) => PADDING.left + index * step;

      const primary = toPoints(data, xScale, yScale);
      const secondary = showSecondary ? toPoints(data, xScale, yScale, "secondary") : [];

      return {
        points: primary,
        secondaryPoints: secondary,
        max: dataMax,
        scaleX: xScale,
        scaleY: yScale,
        areaPath: buildAreaPath(primary, PADDING.top + innerHeight),
        linePath: buildSmoothPath(primary),
        secondaryPath: showSecondary ? buildSmoothPath(secondary) : "",
      };
    }, [data, innerWidth, innerHeight, showSecondary]);

  if (data.length === 0) return null;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelStep = Math.max(1, Math.ceil(data.length / 7));
  const active = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className={cx("relative w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        aria-label={t("charts.areaLabel")}
        onMouseLeave={() => setActiveIndex(null)}>
        <title>{t("charts.areaLabel")}</title>
        <defs>
          <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map((ratio) => {
          const y = PADDING.top + innerHeight * ratio;
          const value = Math.round(max * (1 - ratio));
          return (
            <g key={ratio}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y}
                y2={y}
                stroke="rgb(var(--color-line))"
                strokeDasharray={ratio === 1 ? "0" : "4 6"}
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-current text-[10px]"
                style={{ fill: "rgb(var(--color-ink-muted))" }}>
                {formatNumber(value)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#area-${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {showSecondary && secondaryPath ? (
          <path
            d={secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />
        ) : null}

        {data.map((item, index) => (
          <g key={item.label}>
            <rect
              x={scaleX(index) - innerWidth / (data.length * 2 || 1)}
              y={PADDING.top}
              width={Math.max(12, innerWidth / (data.length || 1))}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              tabIndex={-1}
            />
            {index % labelStep === 0 ? (
              <text
                x={scaleX(index)}
                y={height - 8}
                textAnchor="middle"
                className="text-[10px]"
                style={{ fill: "rgb(var(--color-ink-muted))" }}>
                {item.label}
              </text>
            ) : null}
            {activeIndex === index ? (
              <circle
                cx={scaleX(index)}
                cy={points[index].y}
                r="5"
                fill={color}
                stroke="rgb(var(--color-surface))"
                strokeWidth="2.5"
              />
            ) : null}
          </g>
        ))}
      </svg>

      {active ? (
        <output className="pointer-events-none absolute top-2 start-1/2 -translate-x-1/2 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-ink-inverted shadow-pop rtl:translate-x-1/2">
          <span className="me-2">{active.label}</span>
          <span className="tabular-nums">{valueFormatter(active.value)}</span>
        </output>
      ) : null}
    </div>
  );
}

export default AreaChart;
