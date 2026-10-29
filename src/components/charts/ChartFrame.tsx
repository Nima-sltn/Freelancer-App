import type { ReactNode } from "react";
import type { SeriesPoint } from "@/types";
import { formatNumber } from "@/lib/format/numbers";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";

export interface LegendItem {
  readonly label: string;
  readonly color: string;
  readonly value?: string | number;
}

export function ChartLegend({ items, className }: Readonly<{ readonly items: readonly LegendItem[]; readonly className?: string }>) {
  return (
    <ul className={cx("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
          {item.value !== undefined ? (
            <span className="text-ink-muted tabular-nums">({formatNumber(Number(item.value))})</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Screen-reader alternative for every visualisation (a11y requirement). */
function DataTableFallback({ data, label }: Readonly<{ readonly data: readonly SeriesPoint[]; readonly label: string }>) {
  const { t } = useT();
  return (
    <table className="sr-only">
      <caption>{label}</caption>
      <thead>
        <tr>
          <th scope="col">{t("charts.category")}</th>
          <th scope="col">{t("charts.value")}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.label}>
            <th scope="row">{item.label}</th>
            <td>{formatNumber(item.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Standard chart chrome: title, subtitle, legend, actions and the accessible
 * data alternative. Every chart in the app renders inside this frame so the
 * dashboards stay visually consistent and readable to assistive tech.
 */
export function ChartFrame({
  title,
  subtitle,
  actions,
  legend,
  data,
  dataLabel,
  isEmpty,
  emptyMessage,
  height,
  children,
  className,
}: Readonly<{
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
  readonly legend?: readonly LegendItem[];
  readonly data?: readonly SeriesPoint[];
  readonly dataLabel?: string;
  readonly isEmpty?: boolean;
  readonly emptyMessage?: string;
  readonly height?: number;
  readonly children: ReactNode;
  readonly className?: string;
}>) {
  const { t } = useT();
  const resolvedDataLabel = dataLabel ?? t("charts.dataLabel");
  const resolvedEmpty = emptyMessage ?? t("charts.empty");

  return (
    <figure className={cx("relative m-0 flex flex-col gap-3", className)}>
      {title || subtitle || actions ? (
        <figcaption className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h4 className="text-sm font-bold text-ink">{title}</h4> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </figcaption>
      ) : null}

      {legend && legend.length > 0 ? <ChartLegend items={legend} /> : null}

      <div
        className="relative w-full overflow-hidden"
        style={height ? { minHeight: `${height}px` } : undefined}>
        {isEmpty ? (
          <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-line text-xs text-ink-muted">
            {resolvedEmpty}
          </div>
        ) : (
          children
        )}
      </div>

      {data && data.length > 0 ? <DataTableFallback data={data} label={resolvedDataLabel} /> : null}
    </figure>
  );
}

export default ChartFrame;
