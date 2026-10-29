import { NavLink } from "react-router-dom";
import { navItemsByGroup } from "@/config/navigation";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";
import type { UserRole } from "@/types";
import { IconX } from "@/components/ui/icons";
import { IconFor } from "@/components/ui/IconFor";

interface SidebarProps {
  readonly role: UserRole | undefined;
  readonly onNavigate?: () => void;
  readonly onClose?: () => void;
  readonly className?: string;
}

function getGroupLabelKey(group: string): "nav.menu" | "nav.analytics" | "nav.settings" {
  if (group === "work") return "nav.menu";
  if (group === "insight") return "nav.analytics";
  return "nav.settings";
}

/**
 * Primary navigation.
 *
 * Rendered both as the fixed desktop rail and inside the mobile drawer, so the
 * two can never drift apart. Active state uses `NavLink` (real anchors) with
 * `aria-current` for assistive tech.
 */
export function Sidebar({ role, onNavigate, onClose, className }: Readonly<SidebarProps>) {
  const { t } = useT();
  const groups = navItemsByGroup(role);

  return (
    <nav
      aria-label={t("a11y.mainNav")}
      className={cx("flex h-full flex-col gap-6 overflow-y-auto p-4", className)}>
      {onClose ? (
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-sm font-black text-ink">{t("nav.menu")}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("nav.closeMenu")}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink">
            <IconX className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {groups.map(({ group, items }) => (
        <div key={group} className="flex flex-col gap-1.5">
          <p className="px-3 text-[0.65rem] font-black uppercase tracking-wide text-ink-muted">
            {t(getGroupLabelKey(group))}
          </p>
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx("nav-link", isActive && "nav-link--active")
                  }>
                  <span aria-hidden="true" className="text-lg">
                    <IconFor name={item.icon} />
                  </span>
                  <span className="truncate">{t(item.labelKey)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default Sidebar;
