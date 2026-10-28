import { Switch, SwitchGroup, SwitchLabel } from "@headlessui/react";
import { cx } from "@/lib/cx";

interface ToggleProps {
  label: string;
  enabled: boolean;
  onChange: () => void;
  description?: string;
  disabled?: boolean;
  /** Hides the label visually while keeping it for assistive tech. */
  hideLabel?: boolean;
}

/** Switch built on Headless UI: correct `role="switch"` semantics and keyboard support. */
export function Toggle({
  label,
  enabled,
  onChange,
  description,
  disabled,
  hideLabel,
}: ToggleProps) {
  return (
    <SwitchGroup as="div" className="flex items-center justify-between gap-4">
      <span className="flex flex-col text-start">
        <SwitchLabel className={cx("text-sm font-bold text-ink", hideLabel && "sr-only")}>
          {label}
        </SwitchLabel>
        {description ? <span className="text-xs text-ink-muted">{description}</span> : null}
      </span>
      <Switch
        checked={enabled}
        onChange={onChange}
        disabled={disabled}
        className={cx(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50",
          enabled ? "bg-primary-600" : "bg-line-strong",
          disabled && "opacity-50"
        )}>
        <span
          className={cx(
            "inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-spring",
            enabled ? "translate-x-1 rtl:-translate-x-6" : "-translate-x-1 rtl:-translate-x-1"
          )}
          style={{ height: "1.15rem", width: "1.15rem" }}
        />
      </Switch>
    </SwitchGroup>
  );
}

export default Toggle;
