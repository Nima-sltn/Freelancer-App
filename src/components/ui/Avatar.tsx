import { avatarColor, initials } from "@/lib/format/text";
import { cx } from "@/lib/cx";
import { useT } from "@/store/i18n";

interface AvatarProps {
  readonly name: string;
  readonly src?: string | null;
  readonly size?: "xs" | "sm" | "md" | "lg" | "xl";
  readonly status?: "online" | "offline" | null;
  readonly className?: string;
  /** Adds a decorative ring, used for the current user in the top bar. */
  readonly highlighted?: boolean;
}

const SIZES = {
  xs: "h-6 w-6 text-[0.6rem]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
} as const;

/** Avatar with a deterministic colour fallback — no broken images, no requests. */
export function Avatar({
  name,
  src,
  size = "md",
  status = null,
  highlighted,
  className,
}: Readonly<AvatarProps>) {
  const { t } = useT();
  const label = name?.trim() || t("common.user");
  return (
    <span className={cx("relative inline-flex shrink-0", className)}>
      {src ? (
        <img
          src={src}
          alt={label}
          className={cx(
            "rounded-full object-cover",
            SIZES[size],
            highlighted && "ring-2 ring-primary-500 ring-offset-2 ring-offset-canvas"
          )}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cx(
            "grid place-items-center rounded-full font-black text-white",
            SIZES[size],
            highlighted && "ring-2 ring-primary-500 ring-offset-2 ring-offset-canvas"
          )}
          style={{ backgroundColor: avatarColor(label) }}>
          {initials(label)}
        </span>
      )}
      {src ? <span className="sr-only">{label}</span> : null}
      {status ? (
        <span
          className={cx(
            "absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-surface",
            status === "online" ? "bg-success" : "bg-ink-muted"
          )}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}

export function AvatarGroup({
  people,
  max = 4,
  size = "sm",
}: Readonly<{
  readonly people: readonly { readonly name: string; readonly src?: string | null }[];
  readonly max?: number;
  readonly size?: AvatarProps["size"];
}>) {
  const visible = people.slice(0, max);
  const rest = people.length - visible.length;

  return (
    <span className="flex items-center">
      {visible.map((person) => (
        <span key={person.name} className="-ms-2 first:ms-0 ring-2 ring-surface rounded-full">
          <Avatar name={person.name} src={person.src} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span className="badge badge--neutral -ms-2 ring-2 ring-surface">+{rest}</span>
      ) : null}
    </span>
  );
}

export default Avatar;
