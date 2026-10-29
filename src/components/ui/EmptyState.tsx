import type { ReactNode } from "react";
import { HiOutlineInbox, HiOutlineRefresh } from "react-icons/hi";
import { Button } from "./Button";
import { ApiError } from "@/lib/http/errors";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: Readonly<{
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly className?: string;
}>) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line px-6 py-14 text-center",
        className
      )}>
      <span
        aria-hidden="true"
        className="grid h-14 w-14 place-items-center rounded-full bg-surface-sunken text-2xl text-ink-muted">
        {icon ?? <HiOutlineInbox />}
      </span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm leading-7 text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title,
  className,
}: Readonly<{
  readonly error?: unknown;
  readonly onRetry?: () => void;
  readonly title?: string;
  readonly className?: string;
}>) {
  const { t } = useT();
  const message = getErrorMessage(error, t("common.unknownError"));

  return (
    <div
      role="alert"
      className={cx(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-danger/30 bg-danger/5 px-6 py-12 text-center",
        className
      )}>
      <span aria-hidden="true" className="text-3xl">
        ⚠️
      </span>
      <h3 className="text-base font-bold text-ink">{title ?? t("common.errorHint")}</h3>
      <p className="max-w-md text-sm leading-7 text-ink-soft">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} leadingIcon={<HiOutlineRefresh />}>
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
