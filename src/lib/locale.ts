import type { Locale } from "@/types";

/**
 * Formatters are used from React components, stores, CSV exporters and tests,
 * so the active locale lives in a module-level slot that mirrors the React
 * `I18nProvider`. The provider is the only writer.
 */
let activeLocale: Locale = "fa";

const listeners = new Set<(locale: Locale) => void>();

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function setActiveLocale(locale: Locale): void {
  if (locale === activeLocale) return;
  activeLocale = locale;
  listeners.forEach((listener) => listener(locale));
}

export function subscribeLocale(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** BCP-47 tag used for `Intl` APIs. `fa-IR` renders the Persian (Jalali) calendar. */
export function localeTag(locale: Locale = activeLocale): string {
  return locale === "fa" ? "fa-IR" : "en-GB";
}

export function isRtl(locale: Locale = activeLocale): boolean {
  return locale === "fa";
}
