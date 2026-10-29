import type { ReactNode } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi";
import { useVirtualList } from "@/hooks/useVirtualList";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";
import { EmptyState, ErrorState } from "./EmptyState";
import { SkeletonTable } from "./Skeleton";

export interface Column<T> {
  readonly key: string;
  readonly header: ReactNode;
  readonly render: (row: T) => ReactNode;
  readonly align?: "start" | "center" | "end";
  readonly width?: string;
  readonly sortable?: boolean;
  /** Hidden below `md` — keeps mobile tables readable. */
  readonly hideOnMobile?: boolean;
  readonly className?: string;
}

export type SortDirection = "asc" | "desc";

export interface DataTableSort {
  readonly field: string;
  readonly direction: SortDirection;
}

export interface DataTableProps<T> {
  readonly columns: readonly Column<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  readonly caption?: string;
  readonly isLoading?: boolean;
  readonly error?: unknown;
  readonly onRetry?: () => void;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly emptyAction?: ReactNode;
  readonly sort?: DataTableSort;
  readonly onSortChange?: (field: string) => void;
  /** Enables windowing automatically once the list is long. */
  readonly virtualize?: boolean;
  readonly rowHeight?: number;
  readonly maxHeight?: number;
  readonly onRowClick?: (row: T) => void;
  readonly footer?: ReactNode;
  readonly className?: string;
}

const ALIGN = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
} as const;

function getAriaSort(isSorted: boolean, direction?: SortDirection): "ascending" | "descending" | "none" {
  if (!isSorted) return "none";
  return direction === "asc" ? "ascending" : "descending";
}

function renderSortIcon(isSorted: boolean, direction?: SortDirection) {
  if (!isSorted) return null;
  if (direction === "asc") return <HiChevronUp aria-hidden="true" />;
  return <HiChevronDown aria-hidden="true" />;
}

/**
 * One table for the whole product.
 *
 * Handles the four states every list has (loading, error, empty, data),
 * accessible sorting (`aria-sort` + a real button in the header) and optional
 * windowing so the admin console stays smooth with thousands of rows.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  isLoading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  sort,
  onSortChange,
  virtualize = true,
  rowHeight = 56,
  maxHeight = 620,
  onRowClick,
  footer,
  className,
}: Readonly<DataTableProps<T>>) {
  const { t } = useT();
  const resolvedEmptyTitle = emptyTitle ?? t("common.noData");
  const { start, end, totalHeight, offsetY, containerRef } = useVirtualList(rows.length, {
    itemHeight: rowHeight,
    enabled: virtualize,
  });

  if (isLoading) return <SkeletonTable rows={6} columns={Math.min(columns.length, 6)} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return (
      <EmptyState title={resolvedEmptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  const visibleRows = rows.slice(start, end);
  const usesVirtualSpacers = totalHeight > 0;

  return (
    <div className={cx("flex flex-col gap-3", className)}>
      <div
        ref={containerRef}
        className="table-shell scroll-area"
        style={usesVirtualSpacers ? { maxHeight } : undefined}>
        <table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className={usesVirtualSpacers ? "sticky top-0 z-10" : undefined}>
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.field === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={{ width: column.width }}
                    aria-sort={getAriaSort(isSorted, sort?.direction)}
                    className={cx(
                      ALIGN[column.align ?? "start"],
                      column.hideOnMobile && "hidden md:table-cell"
                    )}>
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.key)}
                        className="inline-flex items-center gap-1 font-bold transition-colors hover:text-primary-700">
                        {column.header}
                        {renderSortIcon(isSorted, sort?.direction)}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {usesVirtualSpacers && offsetY > 0 ? (
              <tr className="pointer-events-none select-none" style={{ height: offsetY }}>
                <td colSpan={columns.length} />
              </tr>
            ) : null}

            {visibleRows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(onRowClick && "cursor-pointer")}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cx(
                      ALIGN[column.align ?? "start"],
                      column.hideOnMobile && "hidden md:table-cell",
                      column.className
                    )}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}

            {usesVirtualSpacers && end < rows.length ? (
              <tr className="pointer-events-none select-none" style={{ height: totalHeight - end * rowHeight }}>
                <td colSpan={columns.length} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

export default DataTable;
