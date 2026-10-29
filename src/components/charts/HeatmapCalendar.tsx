import { useMemo } from "react";
import { useT } from "@/store/i18n";
import { formatNumber } from "@/lib/format/numbers";
import { cx } from "@/lib/cx";

export interface HeatmapActivityDay {
  readonly date: string; // ISO date YYYY-MM-DD
  readonly count: number;
  readonly level?: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapCalendarProps {
  readonly data?: readonly HeatmapActivityDay[];
  readonly weeks?: number;
  readonly className?: string;
  readonly title?: string;
}

const LEVEL_ITEMS = [
  { level: 0, bg: "bg-surface-sunken border border-line" },
  { level: 1, bg: "bg-primary-500/20" },
  { level: 2, bg: "bg-primary-500/40" },
  { level: 3, bg: "bg-primary-500/70" },
  { level: 4, bg: "bg-primary-600" },
] as const;

function computeActivityLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function generateDaysData(data: readonly HeatmapActivityDay[], weeks: number) {
  const map = new Map<string, number>();
  data.forEach((d) => map.set(d.date.slice(0, 10), d.count));

  const totalDays = weeks * 7;
  const result: Array<{ date: string; count: number; level: number; dayOfWeek: number }> = [];
  const now = new Date();

  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const count = map.get(iso) ?? 0;
    const level = computeActivityLevel(count);
    result.push({
      date: iso,
      count,
      level,
      dayOfWeek: d.getDay(),
    });
  }

  return result;
}

/**
 * Accessible zero-dependency GitHub-style Activity Heatmap Calendar.
 * Visualizes user activity / commits / transactions over recent weeks.
 */
export function HeatmapCalendar({
  data = [],
  weeks = 16,
  className,
  title,
}: Readonly<HeatmapCalendarProps>) {
  const { t } = useT();
  const resolvedTitle = title ?? t("heatmap.title");

  const daysData = useMemo(() => generateDaysData(data, weeks), [data, weeks]);

  return (
    <div className={cx("rounded-2xl border border-line/70 bg-surface p-5 shadow-xs", className)}>
      <div className="mb-3.5 flex items-center justify-between">
        <h4 className="text-xs font-bold text-ink uppercase tracking-wider">{resolvedTitle}</h4>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span>{t("common.less")}</span>
          {LEVEL_ITEMS.map((item) => (
            <span key={item.level} className={cx("h-2.5 w-2.5 rounded-sm", item.bg)} />
          ))}
          <span>{t("common.more")}</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          className="grid grid-flow-col gap-1"
          style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
        >
          {daysData.map((day) => (
            <div
              key={day.date}
              title={t("heatmap.tooltip", { date: day.date, count: formatNumber(day.count) })}
              className={cx(
                "h-3 w-3 rounded-sm transition-transform hover:scale-125 hover:ring-2 hover:ring-primary-500/40",
                LEVEL_ITEMS[day.level]?.bg
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default HeatmapCalendar;
