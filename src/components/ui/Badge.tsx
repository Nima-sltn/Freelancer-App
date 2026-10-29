import type { ReactNode } from "react";
import { useT } from "@/store/i18n";
import { PROJECT_STATUS, PROPOSAL_STATUS, USER_STATUS } from "@/config/constants";
import { cx } from "@/lib/cx";
import type { ProjectStatus, ProposalStatus, UserStatus } from "@/types";

export type Tone = "primary" | "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  primary: "badge--primary",
  neutral: "badge--neutral",
  success: "badge--success",
  warning: "badge--warning",
  danger: "badge--danger",
  info: "badge--info",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: Readonly<{
  readonly tone?: Tone;
  readonly icon?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}>) {
  return (
    <span className={cx("badge", TONES[tone], className)}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

export function Chip({
  children,
  onRemove,
  title,
  className,
}: Readonly<{
  readonly children: ReactNode;
  readonly onRemove?: () => void;
  readonly title?: string;
  readonly className?: string;
}>) {
  const { t } = useT();
  return (
    <span className={cx("chip", className)} title={title}>
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={title ?? t("common.delete")}
          className="text-ink-muted transition-colors hover:text-danger">
          ×
        </button>
      ) : null}
    </span>
  );
}

export function Kbd({ children }: Readonly<{ readonly children: ReactNode }>) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-sunken px-1.5 font-sans text-[0.65rem] font-bold text-ink-muted">
      {children}
    </kbd>
  );
}

/* -------------------------------------------------------------------------- */
/* Domain-aware status badges                                                 */
/* -------------------------------------------------------------------------- */

const TONE_MAP: Record<string, Tone> = {
  neutral: "neutral",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};

export function ProjectStatusBadge({ status }: Readonly<{ readonly status: ProjectStatus }>) {
  const { t } = useT();
  const config = PROJECT_STATUS[status];
  return <Badge tone={TONE_MAP[config.tone]}>{t(config.labelKey)}</Badge>;
}

export function ProposalStatusBadge({ status }: Readonly<{ readonly status: ProposalStatus }>) {
  const { t } = useT();
  const config = PROPOSAL_STATUS[status];
  return <Badge tone={TONE_MAP[config.tone]}>{t(config.labelKey)}</Badge>;
}

export function UserStatusBadge({ status }: Readonly<{ readonly status: UserStatus }>) {
  const { t } = useT();
  const config = USER_STATUS[status];
  return <Badge tone={TONE_MAP[config.tone]}>{t(config.labelKey)}</Badge>;
}

export default Badge;
