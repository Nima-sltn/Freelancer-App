import { Avatar } from "@/components/ui/Avatar";
import { useT } from "@/store/i18n";
import type { User } from "@/types";

export interface UserAvatarButtonProps {
  readonly user: User;
  readonly size?: "xs" | "sm" | "md";
}

/** Compact identity chip used in headers and comment threads. */
export function UserAvatarButton({ user, size = "sm" }: Readonly<UserAvatarButtonProps>) {
  const { t } = useT();
  const name = user.name || t("auth.guest");

  return (
    <span className="flex items-center gap-2">
      <Avatar name={name} src={user.avatarUrl} size={size} />
      <span className="truncate text-xs font-bold text-ink-soft">{name}</span>
    </span>
  );
}

export default UserAvatarButton;
