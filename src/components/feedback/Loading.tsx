import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";

export interface SpinnerProps {
  readonly size?: "xs" | "sm" | "md" | "lg";
  readonly className?: string;
  readonly label?: string;
}

const SIZES: Record<NonNullable<SpinnerProps["size"]>, string> = {
  xs: "h-3 w-3 border",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

/**
 * Accessible inline spinner using semantic <output>.
 */
export function Spinner({ size = "md", className, label }: Readonly<SpinnerProps>) {
  const { t } = useT();
  const resolvedLabel = label ?? t("common.loading");

  return (
    <output className={cx("inline-flex items-center", className)}>
      <span
        aria-hidden="true"
        className={cx(
          "animate-spin rounded-full border-primary-500/30 border-t-primary-600",
          SIZES[size]
        )}
      />
      <span className="sr-only">{resolvedLabel}</span>
    </output>
  );
}

/** Centred spinner used inside content regions. */
export function Loading({ label }: Readonly<{ label?: string }>) {
  return (
    <div className="flex w-full items-center justify-center py-16">
      <Spinner size="lg" label={label} />
    </div>
  );
}

/** Full-viewport loader used while a route chunk or the session resolves. */
export function PageLoader({ label }: Readonly<{ readonly label?: string }>) {
  const { t } = useT();
  const resolvedLabel = label ?? t("common.loading");

  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" label={resolvedLabel} />
        <p className="text-sm font-bold text-ink-muted">{resolvedLabel}…</p>
      </div>
    </div>
  );
}

export default Loading;
