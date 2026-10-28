import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { PAGE_SIZES } from "@/config/constants";
import { formatNumber } from "@/lib/format/numbers";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

/** Window-based pagination with an optional page-size selector. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const { t, dir } = useT();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const windowSize = 5;
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), pageCount - windowSize + 1));
  const pages = Array.from(
    { length: Math.min(windowSize, pageCount) },
    (_, index) => start + index
  ).filter((value) => value >= 1 && value <= pageCount);

  return (
    <nav
      aria-label={t("pagination.label")}
      className={cx("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="text-xs font-bold text-ink-muted" aria-live="polite">
        {t("pagination.showing", {
          from: formatNumber(from),
          to: formatNumber(to),
          total: formatNumber(total),
        })}
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-xs font-bold text-ink-muted">
            <span>{t("pagination.perPage")}</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="field-input w-auto py-1.5 text-xs">
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {formatNumber(size)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t("pagination.prev")}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-surface-sunken disabled:opacity-40">
            {dir === "rtl" ? <HiChevronRight aria-hidden="true" /> : <HiChevronLeft aria-hidden="true" />}
          </button>

          {pages.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onPageChange(value)}
              aria-current={value === page ? "page" : undefined}
              className={cx(
                "h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition-colors",
                value === page
                  ? "bg-primary-600 text-white"
                  : "border border-line text-ink-soft hover:bg-surface-sunken"
              )}>
              {formatNumber(value)}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label={t("pagination.next")}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-surface-sunken disabled:opacity-40">
            {dir === "rtl" ? <HiChevronLeft aria-hidden="true" /> : <HiChevronRight aria-hidden="true" />}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Pagination;
