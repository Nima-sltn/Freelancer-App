import { useId, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Tooltip implemented with CSS only (no portal, no measurement pass).
 * It is keyboard accessible because it also renders on focus, and it is
 * announced through `aria-describedby`.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: Readonly<{
  readonly content: ReactNode;
  readonly children: ReactNode;
  readonly side?: "top" | "bottom";
  readonly className?: string;
}>) {
  const id = useId();

  return (
    <span className={cx("group/tt relative inline-flex", className)}>
      <span aria-describedby={id} className="inline-flex">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={cx(
          "pointer-events-none absolute z-40 hidden max-w-xs whitespace-pre-line rounded-lg bg-ink px-2.5 py-1.5 text-xs font-bold text-ink-inverted shadow-pop",
          "start-1/2 -translate-x-1/2 rtl:translate-x-1/2",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          "group-hover/tt:block group-focus-within/tt:block"
        )}>
        {content}
      </span>
    </span>
  );
}

export default Tooltip;
