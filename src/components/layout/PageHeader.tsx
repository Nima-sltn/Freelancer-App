import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { IconArrowStart } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { useMoveBack } from "@/hooks/useMoveBack";
import { cx } from "@/lib/cx";

/**
 * Standard page header: optional back affordance, breadcrumb, title, description
 * and an action slot. Using one component everywhere keeps heading levels
 * consistent (`h1` once per page) which matters for screen-reader navigation.
 */
export function PageHeader({
  title,
  description,
  actions,
  showBack = false,
  breadcrumb,
  icon,
  className,
}: Readonly<{
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly showBack?: boolean;
  readonly breadcrumb?: readonly { readonly label: string; readonly to?: string }[];
  readonly icon?: ReactNode;
  readonly className?: string;
}>) {
  const moveBack = useMoveBack();
  const { t } = useT();

  return (
    <header className={cx("mb-6 flex flex-col gap-3", className)}>
      {breadcrumb && breadcrumb.length > 0 ? <Breadcrumbs items={breadcrumb} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {showBack ? (
            <button
              type="button"
              onClick={moveBack}
              aria-label={t("common.back")}
              className="mt-1 grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink">
              <IconArrowStart className="h-5 w-5" />
            </button>
          ) : null}

          {icon ? (
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-500/10 text-xl text-primary-700">
              {icon}
            </span>
          ) : null}

          <div className="min-w-0">
            <h1 className="text-xl font-black text-ink sm:text-2xl">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-7 text-ink-muted">{description}</p>
            ) : null}
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Breadcrumbs({ items }: Readonly<{ readonly items: readonly { readonly label: string; readonly to?: string }[] }>) {
  const { t } = useT();
  return (
    <nav aria-label={t("a11y.breadcrumb")}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.to ? (
              <Link to={item.to} className="font-bold hover:text-primary-700">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Reads the URL to build a simple breadcrumb when none is passed explicitly. */
export function useAutoBreadcrumb(): Array<{ label: string; to?: string }> {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    label: segment,
    to: `/${segments.slice(0, index + 1).join("/")}`,
  }));
}

export default PageHeader;
