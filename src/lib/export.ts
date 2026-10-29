import { getActiveLocale } from "./locale";
import { toIcsDate } from "./format/dates";

/**
 * Zero-dependency export utilities.
 *
 * Dashboards, the ledger and the timeline all need to hand data back to the
 * user in a format they can forward: CSV for spreadsheets, JSON for backups and
 * iCalendar for deadlines. Everything is generated client-side from data the
 * user already has permission to see.
 */

export interface CsvColumn<T> {
  key: keyof T & string;
  label: string;
  format?: (row: T) => string | number;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(",");
  const body = rows.map((row) =>
    columns
      .map((column) =>
        escapeCsvCell(column.format ? column.format(row) : (row[column.key] as unknown))
      )
      .join(",")
  );
  // The BOM keeps Persian text readable in Excel.
  return `\uFEFF${[header, ...body].join("\r\n")}`;
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8"): void {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[]
): void {
  downloadText(filename, toCsv(rows, columns), "text/csv;charset=utf-8");
}

export function downloadJson(filename: string, data: unknown): void {
  downloadText(filename, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}

export interface CalendarEvent {
  uid: string;
  title: string;
  description?: string;
  start: string | Date;
  end?: string | Date;
  url?: string;
}

export function buildIcs(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FreelanceHub//Deadlines//FA",
    "CALSCALE:GREGORIAN",
  ];

  events.forEach((event) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@freelancehub`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(event.start)}`,
      `DTEND:${toIcsDate(event.end ?? event.start)}`,
      `SUMMARY:${event.title}`,
      ...(event.description ? [`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`] : []),
      ...(event.url ? [`URL:${event.url}`] : []),
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, events: CalendarEvent[]): void {
  downloadText(filename, buildIcs(events), "text/calendar;charset=utf-8");
}

/** Timestamped filename so repeated exports never overwrite each other. */
export function exportFilename(base: string, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${base}-${stamp}.${extension}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Localised number for exports (Persian digits in fa, Latin in en). */
export function localiseNumber(value: number): string {
  return new Intl.NumberFormat(getActiveLocale() === "fa" ? "fa-IR" : "en-GB").format(value);
}
