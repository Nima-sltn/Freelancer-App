import { useMemo, useState } from "react";
import type { SeriesPoint } from "@/types";
import { formatNumber } from "@/lib/format/numbers";
import { useT } from "@/store/i18n";
import { createScale, maxOf, niceCeil, pickColor } from "./utils";

interface BarChartProps {
  data: SeriesPoint[];
  height?: number;
  valueFormatter?: (value: number) => string;
  /** Colours each bar from the categorical palette instead of one accent. */
  colored?: boolean;
  color?: string;
  horizontal?: boolean;
  maxLabels?: number;
}

/** Bar chart (vertical or horizontal) rendered with plain SVG rectangles. */
export function BarChart({
  data,
  height = 240,
  valueFormatter = (value) => formatNumber(value),
  colored = false,
  color = "rgb(var(--color-primary-600))",
  horizontal = false,
  maxLabels = 8,
}: BarChartProps) {
  const { t } = useT();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const layout = useMemo(() => {
    const width = 720;
    const padding = { top: 16, right: 16, bottom: 30, left: 48 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const max = niceCeil(maxOf(data));
    return { width, padding, innerWidth, innerHeight, max };
  }, [data, height]);

  if (data.length === 0) return null;

  if (horizontal) {
    const rowHeight = Math.max(26, height / Math.max(data.length, 1));
    const chartHeight = rowHeight * data.length + 12;
    const labelWidth = 140;
    const scale = createScale(0, layout.max, 0, 720 - labelWidth - 64);

    return (
      <svg
        viewBox={`0 0 720 ${chartHeight}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("charts.barHorizontalLabel")}>
        {data.map((item, index) => {
          const y = index * rowHeight + 6;
          const barWidth = scale(item.value);
          return (
            <g key={item.label}>
              <text
                x={8}
                y={y + rowHeight / 2 + 4}
                className="text-[11px]"
                style={{ fill: "rgb(var(--color-ink-soft))" }}>
                {item.label.length > 22 ? `${item.label.slice(0, 22)}…` : item.label}
              </text>
              <rect
                x={labelWidth}
                y={y + rowHeight / 2 - 7}
                width={Math.max(2, barWidth)}
                height={14}
                rx={7}
                fill={colored ? pickColor(index) : color}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              />
              <text
                x={labelWidth + Math.max(2, barWidth) + 8}
                y={y + rowHeight / 2 + 4}
                className="text-[10px] tabular-nums"
                style={{ fill: "rgb(var(--color-ink-muted))" }}>
                {valueFormatter(item.value)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  const slot = layout.innerWidth / data.length;
  const barWidth = Math.min(38, slot * 0.6);
  const scaleY = createScale(0, layout.max, layout.padding.top + layout.innerHeight, layout.padding.top);
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));
  const baseline = layout.padding.top + layout.innerHeight;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${layout.width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("charts.barLabel")}
        onMouseLeave={() => setActiveIndex(null)}>
        {[0, 0.5, 1].map((ratio) => {
          const y = layout.padding.top + layout.innerHeight * ratio;
          return (
            <line
              key={ratio}
              x1={layout.padding.left}
              x2={layout.width - layout.padding.right}
              y1={y}
              y2={y}
              stroke="rgb(var(--color-line))"
              strokeDasharray={ratio === 1 ? "0" : "4 6"}
            />
          );
        })}

        {data.map((item, index) => {
          const x = layout.padding.left + slot * index + (slot - barWidth) / 2;
          const y = scaleY(item.value);
          const barHeight = Math.max(3, baseline - y);
          return (
            <g key={item.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={8}
                fill={colored ? pickColor(index) : color}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.55}
                className="transition-opacity duration-200"
                onMouseEnter={() => setActiveIndex(index)}
              />
              {index % labelStep === 0 ? (
                <text
                  x={x + barWidth / 2}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-[10px]"
                  style={{ fill: "rgb(var(--color-ink-muted))" }}>
                  {item.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {activeIndex !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute top-2 start-1/2 -translate-x-1/2 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-ink-inverted shadow-pop rtl:translate-x-1/2">
          <span className="me-2">{data[activeIndex].label}</span>
          <span className="tabular-nums">{valueFormatter(data[activeIndex].value)}</span>
        </div>
      ) : null}
    </div>
  );
}

export default BarChart;
