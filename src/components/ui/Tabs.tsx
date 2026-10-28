import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cx } from "@/lib/cx";

export interface TabDefinition {
  id: string;
  label: ReactNode;
  content: ReactNode;
  badge?: ReactNode;
  hidden?: boolean;
}

/** Headless UI tabs: full arrow-key navigation and correct ARIA wiring. */
export function Tabs({
  tabs,
  defaultIndex = 0,
  className,
}: {
  tabs: TabDefinition[];
  defaultIndex?: number;
  className?: string;
}) {
  const visible = tabs.filter((tab) => !tab.hidden);

  return (
    <TabGroup defaultIndex={defaultIndex} className={className}>
      <TabList className="scroll-area no-scrollbar flex gap-1 rounded-xl border border-line bg-surface-sunken p-1">
        {visible.map((tab) => (
          <Tab
            key={tab.id}
            className={({ selected }) =>
              cx(
                "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200",
                selected
                  ? "bg-surface text-primary-700 shadow-sm"
                  : "text-ink-muted hover:text-ink"
              )
            }>
            {tab.label}
            {tab.badge}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="mt-5">
        {visible.map((tab) => (
          <TabPanel key={tab.id} className="focus-visible:outline-none">
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}

/** Compact pill switcher used for view modes (table/board/timeline). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode; icon?: ReactNode; title?: string }>;
  size?: "sm" | "md";
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-sunken p-1">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-lg font-bold transition-all duration-200",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              isActive
                ? "bg-surface text-primary-700 shadow-sm"
                : "text-ink-muted hover:text-ink"
            )}>
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control whose state lives in the route (deep-linkable views). */
export function SegmentedNavLink<T extends string>({
  value,
  options,
  ariaLabel,
  buildHref,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  ariaLabel: string;
  buildHref: (value: T) => string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-sunken p-1">
      {options.map((option) => (
        <NavLink
          key={option.value}
          to={buildHref(option.value)}
          aria-current={value === option.value ? "page" : undefined}
          className={cx(
            "rounded-lg px-3 py-1.5 text-sm font-bold transition-all duration-200",
            value === option.value
              ? "bg-surface text-primary-700 shadow-sm"
              : "text-ink-muted hover:text-ink"
          )}>
          {option.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default Tabs;
