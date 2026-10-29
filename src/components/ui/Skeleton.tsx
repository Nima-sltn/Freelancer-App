import { cx } from "@/lib/cx";

export function Skeleton({
  className,
  style,
}: Readonly<{ readonly className?: string; readonly style?: React.CSSProperties }>) {
  return <span aria-hidden="true" className={cx("skeleton block", className)} style={style} />;
}

export function SkeletonText({
  lines = 3,
  className,
}: Readonly<{ readonly lines?: number; readonly className?: string }>) {
  const lineItems = Array.from({ length: lines }, (_, i) => ({
    id: `sk-line-${i}`,
    isLast: i === lines - 1,
  }));
  return (
    <span className={cx("flex flex-col gap-2", className)}>
      {lineItems.map((item) => (
        <Skeleton
          key={item.id}
          className={cx("h-3", item.isLast ? "w-2/3" : "w-full")}
        />
      ))}
    </span>
  );
}

export function SkeletonStatGrid({ count = 4 }: Readonly<{ readonly count?: number }>) {
  const statItems = Array.from({ length: count }, (_, i) => ({ id: `sk-stat-${i}` }));
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statItems.map((item) => (
        <div key={item.id} className="card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 6,
  columns = 5,
}: Readonly<{ readonly rows?: number; readonly columns?: number }>) {
  const headerCols = Array.from({ length: columns }, (_, i) => ({ id: `sk-th-${i}` }));
  const tableRows = Array.from({ length: rows }, (_, r) => ({
    id: `sk-row-${r}`,
    cols: Array.from({ length: columns }, (_, c) => ({ id: `sk-cell-${r}-${c}` })),
  }));
  return (
    <div className="table-shell p-4">
      <div className="mb-4 flex gap-3">
        {headerCols.map((col) => (
          <Skeleton key={col.id} className="h-4 flex-1" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {tableRows.map((row) => (
          <div key={row.id} className="flex gap-3">
            {row.cols.map((col) => (
              <Skeleton key={col.id} className="h-6 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 220 }: Readonly<{ readonly height?: number }>) {
  const chartBars = Array.from({ length: 12 }, (_, i) => ({
    id: `sk-bar-${i}`,
    heightPct: `${30 + ((i * 37) % 70)}%`,
  }));
  return (
    <div className="card p-5">
      <Skeleton className="mb-4 h-4 w-36" />
      <div className="flex items-end gap-2" style={{ height }}>
        {chartBars.map((bar) => (
          <Skeleton
            key={bar.id}
            className="flex-1"
            style={{ height: bar.heightPct }}
          />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
