import type { ReactNode } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi";
import { useVirtualList } from "@/hooks/useVirtualList";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";
import { EmptyState, ErrorState } from "./EmptyState";
import { SkeletonTable } from "./Skeleton";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "start" | "center" | "end";
  width?: string;
  sortable?: boolean;
  /** Hidden below `md` — keeps mobile tables readable. */
  hideOnMobile?: boolean;
  className?: string;
}

export type SortDirection = "asc" | "desc";

export interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  sort?: { field: string; direction: SortDirection };
  onSortChange?: (field: string) => void;
  /** Enables windowing automatically once the list is long. */
  virtualize?: boolean;
  rowHeight?: number;
  maxHeight?: number;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
  className?: string;
}

const ALIGN = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
} as const;

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
}: DataTableProps<T>) {
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
                    aria-sort={
                      isSorted ? (sort?.direction === "asc" ? "ascending" : "descending") : "none"
                    }
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
                        {isSorted ? (
                          sort?.direction === "asc" ? (
                            <HiChevronUp aria-hidden="true" />
                          ) : (
                            <HiChevronDown aria-hidden="true" />
                          )
                        ) : null}
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
              <tr aria-hidden="true" style={{ height: offsetY }}>
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
              <tr aria-hidden="true" style={{ height: totalHeight - end * rowHeight }}>
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
