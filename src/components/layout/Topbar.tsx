import { Link } from "react-router-dom";
import { IconMenu } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { APP_META, env } from "@/config/env";
import { ROLE_HOME } from "@/config/constants";
import type { User } from "@/types";
import {
  AudioToggle,
  CommandTrigger,
  DemoBadge,
  LanguageToggle,
  NotificationBell,
  PeerSyncIndicator,
  ThemeToggle,
  UserMenu,
} from "./HeaderControls";

interface TopbarProps {
  readonly user: User;
  readonly onOpenMenu: () => void;
  readonly onLogout: () => void;
  readonly isLoadingUser?: boolean;
}

/**
 * Application top bar: identity, global search trigger, notifications and the
 * appearance controls. Falls back to a skeleton while the session resolves so
 * the layout never shifts (the old version blurred the bar and left placeholders).
 */
export function Topbar({ user, onOpenMenu, onLogout, isLoadingUser }: Readonly<TopbarProps>) {
  const { t } = useT();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
      <div className="flex h-[var(--header-height)] items-center gap-3 px-3 sm:px-5">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t("nav.openMenu")}
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink lg:hidden">
          <IconMenu className="h-5 w-5" />
        </button>

        <Link
          to={ROLE_HOME[user.role] ?? "/"}
          className="flex items-center gap-2 rounded-lg text-ink transition-opacity hover:opacity-80">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-primary-600 text-sm font-black text-white">
            FH
          </span>
          <span className="hidden text-sm font-black sm:inline">{APP_META.nameFa}</span>
        </Link>

        <span className="sr-only">{APP_META.name}</span>

        <div className="flex flex-1 items-center justify-center px-2">
          <CommandTrigger />
        </div>

        {env.useMocks ? <DemoBadge /> : null}
        <PeerSyncIndicator />

        <div className="flex items-center gap-1">
          <LanguageToggle />
          <AudioToggle />
          <ThemeToggle />
          <NotificationBell />
          {isLoadingUser ? (
            <span className="skeleton h-9 w-24" aria-hidden="true" />
          ) : (
            <UserMenu
              user={user}
              onLogout={onLogout}
              logoutLabel={t("auth.logout")}
              settingsPath={`/${user.role.toLowerCase()}/settings`}
            />
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
