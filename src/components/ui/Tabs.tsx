import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cx } from "@/lib/cx";

export interface TabDefinition {
  readonly id: string;
  readonly label: ReactNode;
  readonly content: ReactNode;
  readonly badge?: ReactNode;
  readonly hidden?: boolean;
}

export interface TabsProps {
  readonly tabs: readonly TabDefinition[];
  readonly defaultIndex?: number;
  readonly className?: string;
}

/** Headless UI tabs: full arrow-key navigation and correct ARIA wiring. */
export function Tabs({
  tabs,
  defaultIndex = 0,
  className,
}: Readonly<TabsProps>) {
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

export interface SegmentedControlOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  readonly icon?: ReactNode;
  readonly title?: string;
}

export interface SegmentedControlProps<T extends string> {
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly options: readonly SegmentedControlOption<T>[];
  readonly size?: "sm" | "md";
  readonly ariaLabel: string;
}

/** Compact pill switcher used for view modes (table/board/timeline). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  ariaLabel,
}: Readonly<SegmentedControlProps<T>>) {
  return (
    <fieldset
      className="m-0 inline-flex min-w-0 items-center gap-1 rounded-xl border border-line bg-surface-sunken p-1">
      <legend className="sr-only">{ariaLabel}</legend>
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
    </fieldset>
  );
}

export interface SegmentedNavLinkOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
}

export interface SegmentedNavLinkProps<T extends string> {
  readonly value: T;
  readonly options: readonly SegmentedNavLinkOption<T>[];
  readonly ariaLabel: string;
  readonly buildHref: (value: T) => string;
}

/** Segmented control whose state lives in the route (deep-linkable views). */
export function SegmentedNavLink<T extends string>({
  value,
  options,
  ariaLabel,
  buildHref,
}: Readonly<SegmentedNavLinkProps<T>>) {
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
