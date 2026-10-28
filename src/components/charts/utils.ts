import type { SeriesPoint } from "@/types";

export interface Point {
  x: number;
  y: number;
  label?: string;
  value?: number;
}

/** Maps a data value in [dMin, dMax] to a pixel position in [rMin, rMax]. */
export function createScale(dMin: number, dMax: number, rMin: number, rMax: number) {
  const span = dMax - dMin || 1;
  return (value: number) => rMin + ((value - dMin) / span) * (rMax - rMin);
}

/** Rounds an axis maximum up to a human-friendly number (1, 2, 5 × 10ⁿ). */
export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function buildLinePath(points: Point[]): string {
  if (points.length === 0) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
}

/**
 * Catmull-Rom style smoothing using cubic Béziers. Gives the area charts a
 * pleasant curve without pulling in a charting dependency.
 */
export function buildSmoothPath(points: Point[], tension = 0.28): string {
  if (points.length === 0) return "";
  if (points.length < 3) return buildLinePath(points);

  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const previous = points[i - 1] ?? current;
    const afterNext = points[i + 2] ?? next;

    const control1 = {
      x: current.x + (next.x - previous.x) * tension,
      y: current.y + (next.y - previous.y) * tension,
    };
    const control2 = {
      x: next.x - (afterNext.x - current.x) * tension,
      y: next.y - (afterNext.y - current.y) * tension,
    };

    path += ` C${control1.x},${control1.y} ${control2.x},${control2.y} ${next.x},${next.y}`;
  }
  return path;
}

export function buildAreaPath(points: Point[], baselineY: number): string {
  if (points.length === 0) return "";
  const line = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${last.x},${baselineY} L${first.x},${baselineY} Z`;
}

export function toPoints(
  data: SeriesPoint[],
  scaleX: (index: number) => number,
  scaleY: (value: number) => number,
  key: "value" | "secondary" = "value"
): Point[] {
  return data.map((item, index) => ({
    x: scaleX(index),
    y: scaleY(key === "value" ? item.value : (item.secondary ?? 0)),
    label: item.label,
    value: key === "value" ? item.value : (item.secondary ?? 0),
  }));
}

export function maxOf(data: SeriesPoint[]): number {
  return data.reduce((max, item) => Math.max(max, item.value, item.secondary ?? 0), 0);
}

/** Shared categorical palette; also used by donut legends and category chips. */
export const CHART_COLORS = [
  "rgb(var(--color-primary-600))",
  "rgb(var(--color-accent-500))",
  "rgb(var(--color-success))",
  "rgb(var(--color-warning))",
  "rgb(var(--color-info))",
  "rgb(var(--color-danger))",
  "rgb(var(--color-primary-300))",
  "rgb(var(--color-ink-muted))",
];

export function pickColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
