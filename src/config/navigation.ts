import type { IconName, UserRole } from "@/types";

/**
 * Navigation model.
 *
 * Declared once as data (instead of a hand-written `<Sidebar>` per role) so the
 * sidebar, the mobile drawer, the breadcrumb and the command palette all read
 * from the same source and can never disagree about what exists.
 */

export type NavGroup = "work" | "insight" | "account";

export interface NavItem {
  /** Path segment relative to the role prefix, e.g. `projects`. */
  segment: string;
  labelKey: string;
  /** Key of the icon registry — the nav model is data, the glyphs live in the UI layer. */
  icon: IconName;
  roles: UserRole[];
  group: NavGroup;
  /** Exact matching for index routes. */
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    segment: "dashboard",
    labelKey: "nav.dashboard",
    icon: "home",
    roles: ["OWNER", "FREELANCER", "ADMIN"],
    group: "work",
    end: true,
  },
  {
    segment: "projects",
    labelKey: "nav.projects",
    icon: "grid",
    roles: ["OWNER", "FREELANCER", "ADMIN"],
    group: "work",
  },
  {
    segment: "proposals",
    labelKey: "nav.proposals",
    icon: "clipboard",
    roles: ["FREELANCER", "ADMIN"],
    group: "work",
  },
  {
    segment: "board",
    labelKey: "nav.board",
    icon: "board",
    roles: ["FREELANCER"],
    group: "work",
  },
  {
    segment: "users",
    labelKey: "nav.users",
    icon: "users",
    roles: ["ADMIN"],
    group: "work",
  },
  {
    segment: "categories",
    labelKey: "categories.title",
    icon: "collection",
    roles: ["ADMIN"],
    group: "work",
  },
  {
    segment: "trust",
    labelKey: "nav.trust",
    icon: "shield",
    roles: ["ADMIN", "OWNER"],
    group: "insight",
  },
  {
    segment: "analytics",
    labelKey: "nav.analytics",
    icon: "chart",
    roles: ["OWNER", "ADMIN"],
    group: "insight",
  },
  {
    segment: "timeline",
    labelKey: "nav.timeline",
    icon: "document",
    roles: ["OWNER", "FREELANCER"],
    group: "insight",
  },
  {
    segment: "wallet",
    labelKey: "nav.wallet",
    icon: "wallet",
    roles: ["OWNER", "FREELANCER"],
    group: "insight",
  },
  {
    segment: "leaderboard",
    labelKey: "nav.leaderboard",
    icon: "star",
    roles: ["FREELANCER"],
    group: "insight",
  },
  {
    segment: "audit",
    labelKey: "nav.audit",
    icon: "clipboard",
    roles: ["ADMIN", "OWNER"],
    group: "insight",
  },
  {
    segment: "messages",
    labelKey: "nav.messages",
    icon: "chat",
    roles: ["OWNER", "FREELANCER", "ADMIN"],
    group: "account",
  },
  {
    segment: "settings",
    labelKey: "nav.settings",
    icon: "settings",
    roles: ["OWNER", "FREELANCER", "ADMIN"],
    group: "account",
  },
  {
    segment: "journey",
    labelKey: "tx.inspector",
    icon: "palette",
    roles: ["OWNER", "FREELANCER", "ADMIN"],
    group: "account",
  },
];

export const ROLE_PREFIX: Record<UserRole, string> = {
  OWNER: "/owner",
  FREELANCER: "/freelancer",
  ADMIN: "/admin",
};

export const GROUP_LABEL: Record<NavGroup, string> = {
  work: "dashboard.overview",
  insight: "nav.analytics",
  account: "nav.settings",
};

export interface ResolvedNavItem extends NavItem {
  to: string;
}

/** Absolute navigation entries for a role, in declaration order. */
export function navItemsForRole(role: UserRole | undefined): ResolvedNavItem[] {
  if (!role) return [];
  const prefix = ROLE_PREFIX[role];
  return NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => ({
    ...item,
    to: `${prefix}/${item.segment}`,
  }));
}

export function navItemsByGroup(role: UserRole | undefined): Array<{
  group: NavGroup;
  items: ResolvedNavItem[];
}> {
  const items = navItemsForRole(role);
  const groups: NavGroup[] = ["work", "insight", "account"];
  return groups
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0);
}
