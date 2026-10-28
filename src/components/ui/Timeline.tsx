import type { ReactNode } from "react";
import { formatRelative } from "@/lib/format/dates";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  at: string;
  tone?: "primary" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
  meta?: ReactNode;
}

const DOT_TONES = {
  primary: "bg-primary-600",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
} as const;

/**
 * Vertical activity feed shared by the audit log, project history and the
 * transaction journal. Announced as a list so screen readers keep the order.
 */
export function Timeline({
  items,
  className,
  emptyMessage,
}: {
  items: TimelineItem[];
  className?: string;
  emptyMessage?: string;
}) {
  const { t } = useT();
  const resolvedEmptyMessage = emptyMessage ?? t("timeline.empty");
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-muted">{resolvedEmptyMessage}</p>;
  }

  return (
    <ol className={cx("relative flex flex-col gap-5 ps-6", className)}>
      <span
        aria-hidden="true"
        className="absolute bottom-2 end-auto start-[0.4rem] top-2 w-px bg-line"
      />
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            aria-hidden="true"
            className={cx(
              "absolute -start-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface",
              DOT_TONES[item.tone ?? "primary"]
            )}
          />
          <div className="flex flex-wrap items-center gap-x-2">
            <p className="text-sm font-bold text-ink">{item.title}</p>
            <time className="text-xs text-ink-muted" dateTime={item.at}>
              {formatRelative(item.at)}
            </time>
          </div>
          {item.description ? (
            <p className="mt-1 text-xs leading-6 text-ink-muted">{item.description}</p>
          ) : null}
          {item.meta ? <div className="mt-2 flex flex-wrap gap-2">{item.meta}</div> : null}
        </li>
      ))}
    </ol>
  );
}

export default Timeline;
