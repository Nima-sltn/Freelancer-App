import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "@/types";
import { isRtl as computeIsRtl, setActiveLocale } from "@/lib/locale";
import { formatRelative } from "@/lib/format/dates";
import { dictionaries, fa, type TranslationKey } from "./translations";

export type TranslateParams = Record<string, string | number | undefined>;

export interface I18nContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  /** Translates a key and interpolates `{placeholder}` tokens. */
  t: (key: TranslationKey | string, params?: TranslateParams) => string;
  /** Translates a pluralized key with count. */
  tp: (key: TranslationKey | string, count: number, params?: TranslateParams) => string;
  /** Formats a relative time string according to current locale. */
  tRelative: (date: string | number | Date) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = "i18n.locale";

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(`fh.${STORAGE_KEY}`);
    if (stored === '"fa"' || stored === '"en"') return stored.replace(/"/g, "") as Locale;
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return "fa";
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    params[token] === undefined ? match : String(params[token])
  );
}

/**
 * Language and direction provider.
 *
 * The product is Persian-first but must stay usable in English, so the locale
 * drives three things at once: the `<html lang>`/`dir` attributes, the string
 * dictionary and the module-level locale used by pure formatters (`Intl`
 * number, currency and Jalali/Gregorian date rendering).
 */
export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(`fh.${STORAGE_KEY}`, JSON.stringify(next));
    } catch {
      /* persisting the locale is best effort */
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "fa" ? "en" : "fa");
  }, [locale, setLocale]);

  const dir = computeIsRtl(locale) ? "rtl" : "ltr";

  useEffect(() => {
    setActiveLocale(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.documentElement.dataset.locale = locale;
  }, [locale, dir]);

  const t = useCallback<I18nContextValue["t"]>(
    (key, params) => {
      const dictionary = dictionaries[locale] ?? fa;
      const template = dictionary[key as TranslationKey] ?? fa[key as TranslationKey] ?? key;
      return interpolate(template, params);
    },
    [locale]
  );

  const tp = useCallback<I18nContextValue["tp"]>(
    (key, count, params) => {
      const dictionary = dictionaries[locale] ?? fa;
      const pluralForm = count === 1 ? "one" : count === 0 ? "zero" : "other";
      const pluralKey = `${key}_${pluralForm}` as TranslationKey;
      const template =
        dictionary[pluralKey] ??
        dictionary[key as TranslationKey] ??
        fa[pluralKey] ??
        fa[key as TranslationKey] ??
        key;
      return interpolate(template, { count, ...params });
    },
    [locale]
  );

  const tRelative = useCallback<I18nContextValue["tRelative"]>(
    (date) => {
      return formatRelative(date, locale);
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir,
      isRtl: computeIsRtl(locale),
      setLocale,
      toggleLocale,
      t,
      tp,
      tRelative,
    }),
    [locale, dir, setLocale, toggleLocale, t, tp, tRelative]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}

/**
 * Convenience hook for components that only need translation helpers.
 *
 * It mirrors the `t`/`locale`/`dir` triple plus the two locale mutators, so
 * header controls and settings screens do not have to reach for the fuller
 * context just to switch language.
 */
export function useT(): {
  t: I18nContextValue["t"];
  tp: I18nContextValue["tp"];
  tRelative: I18nContextValue["tRelative"];
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: I18nContextValue["setLocale"];
  toggleLocale: I18nContextValue["toggleLocale"];
} {
  const { t, tp, tRelative, locale, dir, setLocale, toggleLocale } = useI18n();
  return { t, tp, tRelative, locale, dir, setLocale, toggleLocale };
}

export function getStoredLocale(): Locale {
  return readStoredLocale();
}

export function translateDirect(key: string, locale?: Locale, params?: TranslateParams): string {
  const currentLocale = locale ?? readStoredLocale();
  const dict = dictionaries[currentLocale] ?? fa;
  const template = dict[key as TranslationKey] ?? fa[key as TranslationKey] ?? key;
  return interpolate(template, params);
}

export default I18nProvider;
