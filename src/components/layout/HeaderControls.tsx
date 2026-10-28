import { Fragment } from "react";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { Link } from "react-router-dom";
import {
  IconBell,
  IconLogout,
  IconMoon,
  IconSelector,
  IconSettings,
  IconSun,
  IconTranslate,
  IconUser,
} from "@/components/ui/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Kbd, Badge } from "@/components/ui/Badge";
import { useNotifications } from "@/store/notifications";
import { useTheme } from "@/store/theme";
import { useT } from "@/store/i18n";
import { useCommandPalette } from "@/store/command";
import { formatRelative } from "@/lib/format/dates";
import { formatNumber } from "@/lib/format/numbers";
import { cx } from "@/lib/cx";
import type { User } from "@/types";

/** Icon button used across the top bar. */
function ControlButton({
  label,
  onClick,
  children,
  className,
  badge,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx(
        "relative grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink",
        className
      )}>
      {children}
      {badge && badge > 0 ? (
        <span className="absolute -top-0.5 -end-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.6rem] font-black text-white">
          {formatNumber(Math.min(badge, 99))}
        </span>
      ) : null}
    </button>
  );
}

export function ThemeToggle() {
  const { isDark, toggleDarkMode } = useTheme();
  const { t } = useT();
  return (
    <ControlButton label={t("a11y.themeToggle")} onClick={toggleDarkMode}>
      {isDark ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
    </ControlButton>
  );
}

export function LanguageToggle() {
  const { locale, toggleLocale, t } = useT();
  return (
    <ControlButton
      label={`${t("a11y.languageToggle")} (${locale === "fa" ? "EN" : "FA"})`}
      onClick={toggleLocale}>
      <IconTranslate className="h-5 w-5" />
    </ControlButton>
  );
}

export function CommandTrigger() {
  const { open } = useCommandPalette();
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={open}
      className="hidden items-center gap-2 rounded-lg border border-line bg-surface-sunken px-3 py-1.5 text-xs font-bold text-ink-muted transition-colors hover:border-line-strong hover:text-ink md:inline-flex">
      <IconSelector className="h-4 w-4" aria-hidden="true" />
      <span className="text-ink-muted">{t("common.search")}</span>
      <Kbd>⌘K</Kbd>
    </button>
  );
}

/** Notification bell with a recent-items popover. */
export function NotificationBell() {
  const { items, unreadCount, markAllRead, markRead } = useNotifications();
  const { t } = useT();
  const recent = items.slice(0, 5);

  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label={t("notifications.title")}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink">
        <IconBell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -end-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.6rem] font-black text-white">
            {formatNumber(Math.min(unreadCount, 99))}
          </span>
        ) : null}
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition duration-150 ease-out"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition duration-100 ease-in"
        leaveFrom="opacity-100"
        leaveTo="opacity-0">
        <MenuItems
          anchor="bottom end"
          className="z-50 mt-2 w-80 rounded-card border border-line bg-surface p-2 shadow-pop [--anchor-gap:0.5rem]">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <p className="text-sm font-black text-ink">{t("notifications.title")}</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-bold text-primary-700 hover:underline">
                {t("notifications.markAllRead")}
              </button>
            ) : null}
          </div>

          {recent.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-ink-muted">
              {t("notifications.empty")}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {recent.map((item) => (
                <li key={item.id}>
                  <MenuItem>
                    {({ focus }) => (
                      <Link
                        to={item.href ?? "#"}
                        onClick={() => markRead(item.id)}
                        className={cx(
                          "flex flex-col gap-1 rounded-lg px-2 py-2 text-start transition-colors",
                          focus && "bg-surface-sunken"
                        )}>
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={cx(
                              "h-2 w-2 shrink-0 rounded-full",
                              item.severity === "success" && "bg-success",
                              item.severity === "warning" && "bg-warning",
                              item.severity === "danger" && "bg-danger",
                              item.severity === "info" && "bg-info"
                            )}
                          />
                          <span className="text-xs font-bold text-ink">
                            {t(item.titleKey, item.params)}
                          </span>
                          {!item.read ? <Badge tone="primary">{t("common.new")}</Badge> : null}
                        </span>
                        {item.bodyKey ? (
                          <span className="ps-4 text-xs leading-6 text-ink-muted">
                            {t(item.bodyKey, item.params)}
                          </span>
                        ) : null}
                        <span className="ps-4 text-[0.65rem] text-ink-muted">
                          {formatRelative(item.createdAt)}
                        </span>
                      </Link>
                    )}
                  </MenuItem>
                </li>
              ))}
            </ul>
          )}
        </MenuItems>
      </Transition>
    </Menu>
  );
}

/** Account menu: profile, settings, sign out. */
export function UserMenu({
  user,
  onLogout,
  logoutLabel,
  settingsPath,
}: {
  user: User;
  onLogout: () => void;
  logoutLabel: string;
  settingsPath: string;
}) {
  const { t } = useT();

  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label={t("a11y.userMenu")}
        className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface-sunken">
        <Avatar name={user.name || t("auth.guest")} src={user.avatarUrl} size="sm" highlighted />
        <span className="hidden max-w-32 truncate text-xs font-bold text-ink-soft lg:inline">
          {user.name || t("auth.guest")}
        </span>
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition duration-150 ease-out"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition duration-100 ease-in"
        leaveFrom="opacity-100"
        leaveTo="opacity-0">
        <MenuItems
          anchor="bottom end"
          className="z-50 mt-2 w-60 rounded-card border border-line bg-surface p-2 shadow-pop [--anchor-gap:0.5rem]">
          <div className="border-b border-line px-2 pb-2">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
            <p className="mt-1 text-xs font-bold text-primary-700">
              {t(`role.${user.role}`)}
            </p>
          </div>

          <MenuItem>
            {({ focus }) => (
              <Link
                to={settingsPath}
                className={cx(
                  "mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-ink-soft",
                  focus && "bg-surface-sunken text-ink"
                )}>
                <IconSettings className="h-4 w-4" />
                {t("nav.settings")}
              </Link>
            )}
          </MenuItem>

          <MenuItem>
            {({ focus }) => (
              <Link
                to={settingsPath}
                className={cx(
                  "flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-ink-soft",
                  focus && "bg-surface-sunken text-ink"
                )}>
                <IconUser className="h-4 w-4" />
                {t("nav.profile")}
              </Link>
            )}
          </MenuItem>

          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={onLogout}
                className={cx(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-danger",
                  focus && "bg-danger/10"
                )}>
                <IconLogout className="h-4 w-4" />
                {logoutLabel}
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  );
}

export function DemoBadge() {
  const { t } = useT();
  return (
    <span
      title={t("app.demoTooltip")}
      className="hidden items-center gap-1.5 rounded-full border border-line/80 bg-surface-sunken/80 px-2.5 py-1 text-[0.7rem] font-bold text-ink-muted backdrop-blur sm:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-primary-500" aria-hidden="true" />
      {t("app.demoBadge")}
    </span>
  );
}
