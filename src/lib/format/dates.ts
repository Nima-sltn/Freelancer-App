import type { Locale } from "@/types";
import { getActiveLocale, localeTag } from "../locale";
import { formatNumber } from "./numbers";

export const MS_PER_DAY = 86_400_000;

export type DateInput = string | number | Date | null | undefined;

export function toDate(value: DateInput): Date {
  if (value instanceof Date) return value;
  if (value === null || value === undefined || value === "") return new Date(NaN);
  const parsed = new Date(value);
  return parsed;
}

export function isValidDate(value: unknown): value is Date | string {
  return !Number.isNaN(toDate(value as string).getTime());
}

export interface DateFormatOptions {
  locale?: Locale;
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  withTime?: boolean;
  withWeekday?: boolean;
}

/**
 * `fa-IR` resolves to the Persian (Jalali) calendar automatically through ICU,
 * so the same call renders ۱۴۰۳/۰۵/۱۲ or 12/08/2024 depending on the locale.
 */
export function formatDate(
  value: DateInput,
  options: DateFormatOptions = {}
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const locale = options.locale ?? getActiveLocale();
  const formatter = new Intl.DateTimeFormat(localeTag(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(options.withWeekday ? { weekday: "long" } : {}),
    ...(options.withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
  return formatter.format(date);
}

export function formatDateShort(
  value: DateInput,
  locale: Locale = getActiveLocale()
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(localeTag(locale), {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(
  value: DateInput,
  locale: Locale = getActiveLocale()
): string {
  return formatDate(value, { locale, withTime: true });
}

export function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(date: Date, locale: Locale = getActiveLocale()): string {
  return new Intl.DateTimeFormat(localeTag(locale), { month: "short" }).format(date);
}

/** "۳ روز پیش" / "3 days ago" via `Intl.RelativeTimeFormat` — never a stale string. */
export function formatRelative(
  value: DateInput,
  locale: Locale = getActiveLocale(),
  now: Date = new Date()
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = date.getTime() - now.getTime();
  const formatter = new Intl.RelativeTimeFormat(localeTag(locale), { numeric: "auto" });
  const thresholds: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * MS_PER_DAY],
    ["month", 30 * MS_PER_DAY],
    ["day", MS_PER_DAY],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, ms] of thresholds) {
    if (Math.abs(diffMs) >= ms) {
      return formatter.format(Math.round(diffMs / ms), unit);
    }
  }
  return formatter.format(Math.round(diffMs / 1000), "second");
}

export function daysBetween(from: string | Date, to: string | Date): number {
  const start = toDate(from).getTime();
  const end = toDate(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / MS_PER_DAY);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatDuration(days: number, locale: Locale = getActiveLocale()): string {
  const unit = locale === "fa" ? "روز" : "days";
  return `${formatNumber(days, { locale })} ${unit}`;
}

/** `YYYY-MM-DD` for `<input type="date">`. */
export function toDateInputValue(value: string | Date): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export interface DeadlineInfo {
  days: number;
  isOverdue: boolean;
  isUrgent: boolean;
  tone: "success" | "warning" | "danger" | "neutral";
}

/** Shared deadline semantics so project cards, tables and the timeline agree. */
export function getDeadlineInfo(
  deadline: string | Date,
  now: Date = new Date()
): DeadlineInfo {
  const date = toDate(deadline);
  if (Number.isNaN(date.getTime())) {
    return { days: 0, isOverdue: false, isUrgent: false, tone: "neutral" };
  }
  const days = daysBetween(now, date);
  if (days < 0) return { days, isOverdue: true, isUrgent: true, tone: "danger" };
  if (days <= 3) return { days, isOverdue: false, isUrgent: true, tone: "warning" };
  return { days, isOverdue: false, isUrgent: false, tone: "success" };
}

/** Minimal iCalendar serialiser, used by the "add deadline to calendar" action. */
export function toIcsDate(value: string | Date): string {
  return toDate(value).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
