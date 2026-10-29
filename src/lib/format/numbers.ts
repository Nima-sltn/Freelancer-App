import type { Locale } from "@/types";
import { getActiveLocale, localeTag } from "../locale";

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Converts Latin digits inside an arbitrary string to Persian digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/** Converts Persian/Arabic digits back to Latin so they can be parsed. */
export function toLatinDigits(input: string | number): string {
  return String(input)
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

/** Parses user input that may contain Persian digits, separators or spaces. */
export function parseNumeric(input: string | number | null | undefined): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (!input) return 0;
  const cleaned = toLatinDigits(input)
    .replace(/[,\s٫،]/g, (match) => (match === "٫" ? "." : ""))
    .replace(/[^\d.-]/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

export interface NumberFormatOptions {
  locale?: Locale;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  /** Always render Persian digits regardless of locale (used in charts). */
  persianDigits?: boolean;
}

export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  const locale = options.locale ?? getActiveLocale();
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat(localeTag(locale), {
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  }).format(safe);
  return options.persianDigits ? toPersianDigits(formatted) : formatted;
}

/**
 * Digit-only values (phone numbers, OTPs, reference codes) rendered with the
 * active locale's digits but without grouping separators.
 */
export function formatDigits(input: string | number): string {
  return getActiveLocale() === "fa" ? toPersianDigits(input) : toLatinDigits(input);
}

/** `1234567` -> `۱٫۲ میلیون` style compact notation for dashboards. */
export function formatCompact(value: number, locale: Locale = getActiveLocale()): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(localeTag(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(safe);
}

/**
 * Currency formatting. The API stores plain integers (Toman), so the label is
 * appended rather than injected through `Intl` currency style, which would try
 * to resolve a real ISO currency.
 */
export function formatCurrency(
  value: number,
  options: NumberFormatOptions & { withLabel?: boolean; compact?: boolean } = {}
): string {
  const locale = options.locale ?? getActiveLocale();
  const withLabel = options.withLabel ?? true;
  if (options.compact) {
    const compact = formatCompact(value, locale);
    if (!withLabel) return compact;
    const suffix = locale === "fa" ? "تومان" : "T";
    return `${compact} ${suffix}`;
  }
  const formatted = formatNumber(value, { ...options, locale });
  if (!withLabel) return formatted;
  const suffix = locale === "fa" ? "تومان" : "IRR";
  return `${formatted} ${suffix}`;
}

/** `0.4213` -> `۴۲٪` */
export function formatPercent(
  ratio: number,
  options: NumberFormatOptions & { fractionDigits?: number } = {}
): string {
  const locale = options.locale ?? getActiveLocale();
  const safe = Number.isFinite(ratio) ? ratio : 0;
  const fractionDigits = options.fractionDigits ?? 0;
  return new Intl.NumberFormat(localeTag(locale), {
    style: "percent",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(safe);
}

/** Ordinal-ish label used in stat cards, e.g. "۱۲ از ۴۰". */
export function formatRatio(current: number, total: number, locale?: Locale): string {
  const l = locale ?? getActiveLocale();
  const separator = l === "fa" ? " از " : " of ";
  return `${formatNumber(current, { locale: l })}${separator}${formatNumber(total, { locale: l })}`;
}

/** Splits a number into digits so callers can animate/colour them individually. */
export function toDigitArray(value: number | string): string[] {
  return String(value).split("");
}
