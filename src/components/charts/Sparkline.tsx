import { useMemo } from "react";
import { useT } from "@/store/i18n";
import { buildSmoothPath, createScale } from "./utils";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Renders a soft gradient area under the line. */
  filled?: boolean;
  label?: string;
}

/** Compact trend indicator used inside stat cards and table rows. */
export function Sparkline({
  values,
  width = 110,
  height = 34,
  color = "rgb(var(--color-primary-600))",
  filled = true,
  label,
}: SparklineProps) {
  const { t } = useT();
  const paths = useMemo(() => {
    if (values.length === 0) return null;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const scaleY = createScale(min === max ? 0 : min, max, height - 4, 4);
    const step = values.length > 1 ? width / (values.length - 1) : 0;
    const points = values.map((value, index) => ({ x: index * step, y: scaleY(value) }));
    const line = buildSmoothPath(points, 0.2);
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [values, width, height]);

  if (!paths) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? t("charts.sparklineLabel")}
      className="overflow-visible">
      {filled ? <path d={paths.area} fill={color} opacity="0.12" /> : null}
      <path
        d={paths.line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
