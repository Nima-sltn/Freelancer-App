import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatDuration,
  formatMonthKey,
  formatRelative,
  getDeadlineInfo,
  isValidDate,
  MS_PER_DAY,
  toDate,
  toDateInputValue,
  toIcsDate,
} from "./dates";

const DAY = MS_PER_DAY;

describe("toDate / isValidDate", () => {
  it("returns an invalid date for empty and malformed input", () => {
    expect(Number.isNaN(toDate(null).getTime())).toBe(true);
    expect(Number.isNaN(toDate("").getTime())).toBe(true);
    expect(Number.isNaN(toDate("not-a-date").getTime())).toBe(true);
  });

  it("passes Date instances through untouched", () => {
    const date = new Date("2024-05-03T12:00:00Z");
    expect(toDate(date)).toBe(date);
  });

  it("validates values", () => {
    expect(isValidDate("2024-01-01")).toBe(true);
    expect(isValidDate("nope")).toBe(false);
  });
});

describe("date formatting", () => {
  it("renders an em dash instead of 'Invalid Date'", () => {
    expect(formatDate("nonsense")).toBe("—");
    expect(formatDateShort(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatRelative("nonsense")).toBe("—");
  });

  it("formats valid dates for the given locale", () => {
    const value = "2024-05-03T12:00:00Z";
    expect(formatDateShort(value, "en")).toMatch(/\d{2}\/\d{2}\/\d{2}/);
    expect(formatDate(value, { locale: "en" })).toContain("2024");
  });
});

describe("formatRelative", () => {
  const now = new Date("2024-05-10T12:00:00Z");

  it("describes a past date relative to now", () => {
    const past = new Date(now.getTime() - 3 * DAY);
    expect(formatRelative(past, "en", now)).toBe("3 days ago");
  });

  it("describes a future date", () => {
    const future = new Date(now.getTime() + 2 * 3600_000);
    expect(formatRelative(future, "en", now)).toBe("in 2 hours");
  });

  it("falls back to seconds for near-identical timestamps", () => {
    expect(formatRelative(new Date(now.getTime() - 30_000), "en", now)).toBe("30 seconds ago");
    expect(formatRelative(now, "en", now)).toBe("now");
  });
});

describe("arithmetic helpers", () => {
  it("counts whole days between two dates", () => {
    expect(daysBetween("2024-01-01T00:00:00Z", "2024-01-11T00:00:00Z")).toBe(10);
    expect(daysBetween("2024-01-11T00:00:00Z", "2024-01-01T00:00:00Z")).toBe(-10);
    expect(daysBetween("bad", "worse")).toBe(0);
  });

  it("adds days without mutating the input", () => {
    const start = new Date(2024, 0, 31, 12);
    expect(addDays(start, 1).getMonth()).toBe(1);
    expect(start.getMonth()).toBe(0);
  });

  it("builds a stable month key and label", () => {
    expect(formatMonthKey(new Date(2024, 0, 15))).toBe("2024-01");
  });

  it("formats a duration with a locale unit", () => {
    expect(formatDuration(5, "en")).toBe("5 days");
    expect(formatDuration(5, "fa")).toContain("روز");
  });
});

describe("getDeadlineInfo", () => {
  const now = new Date("2024-05-10T12:00:00Z");

  it("flags an overdue deadline as danger", () => {
    const info = getDeadlineInfo(new Date(now.getTime() - DAY), now);
    expect(info.isOverdue).toBe(true);
    expect(info.tone).toBe("danger");
  });

  it("flags an imminent deadline as warning", () => {
    const info = getDeadlineInfo(new Date(now.getTime() + 2 * DAY), now);
    expect(info.isUrgent).toBe(true);
    expect(info.isOverdue).toBe(false);
    expect(info.tone).toBe("warning");
    expect(info.days).toBe(2);
  });

  it("flags a comfortable deadline as success", () => {
    const info = getDeadlineInfo(new Date(now.getTime() + 20 * DAY), now);
    expect(info.isUrgent).toBe(false);
    expect(info.tone).toBe("success");
  });

  it("degrades gracefully on an invalid date", () => {
    expect(getDeadlineInfo("bad", now)).toEqual({
      days: 0,
      isOverdue: false,
      isUrgent: false,
      tone: "neutral",
    });
  });
});

describe("browser-facing helpers", () => {
  it("produces a YYYY-MM-DD value for date inputs", () => {
    expect(toDateInputValue(new Date(2024, 4, 3, 12))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toDateInputValue("bad")).toBe("");
  });

  it("serialises an iCalendar timestamp", () => {
    expect(toIcsDate("2024-05-03T12:00:00Z")).toBe("20240503T120000Z");
  });
});
