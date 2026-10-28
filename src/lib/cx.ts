type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | undefined | null>;

/**
 * Tiny `classnames`/`clsx` replacement.
 *
 * The project deliberately avoids a runtime dependency for something this small;
 * conditional object syntax keeps component className expressions readable:
 *
 * ```tsx
 * cx("btn", { "btn--primary": isPrimary, "btn--ghost": !isPrimary }, className)
 * ```
 */
export function cx(...values: ClassValue[]): string {
  const out: string[] = [];

  const walk = (value: ClassValue): void => {
    if (!value) return;
    if (typeof value === "string" || typeof value === "number") {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object") {
      for (const [key, enabled] of Object.entries(value)) {
        if (enabled) out.push(key);
      }
    }
  };

  values.forEach(walk);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

export default cx;
