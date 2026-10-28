import { describe, expect, it } from "vitest";
import { setActiveLocale } from "../locale";
import {
  formatCompact,
  formatCurrency,
  formatDigits,
  formatNumber,
  formatPercent,
  formatRatio,
  parseNumeric,
  toDigitArray,
  toLatinDigits,
  toPersianDigits,
} from "./numbers";

describe("digit translation", () => {
  it("converts Latin digits to Persian and back", () => {
    expect(toPersianDigits("09123456789")).toBe("۰۹۱۲۳۴۵۶۷۸۹");
    expect(toLatinDigits("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("round-trips Arabic-Indic digits", () => {
    expect(toLatinDigits(toLatinDigits("١٢٣"))).toBe("123");
  });

  it("leaves non-numeric characters untouched", () => {
    expect(toPersianDigits("OTP: 42")).toBe("OTP: ۴۲");
  });
});

describe("parseNumeric", () => {
  it("parses Persian digits with grouping separators", () => {
    expect(parseNumeric("۱۲٬۵۰۰")).toBe(12500);
    expect(parseNumeric("۱۲,۵۰۰")).toBe(12500);
  });

  it("understands the Persian decimal separator", () => {
    expect(parseNumeric("۲٫۵")).toBe(2.5);
  });

  it("accepts negative numbers and strips currency words", () => {
    expect(parseNumeric("-۴۵")).toBe(-45);
    expect(parseNumeric("۱۲۰۰۰ تومان")).toBe(12000);
  });

  it("returns 0 for empty and unparseable input", () => {
    expect(parseNumeric("")).toBe(0);
    expect(parseNumeric(null)).toBe(0);
    expect(parseNumeric(undefined)).toBe(0);
    expect(parseNumeric("abc")).toBe(0);
    expect(parseNumeric(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("passes finite numbers straight through", () => {
    expect(parseNumeric(1234.5)).toBe(1234.5);
  });
});

describe("formatNumber", () => {
  it("groups thousands for the English locale", () => {
    expect(formatNumber(1234, { locale: "en" })).toBe("1,234");
  });

  it("renders Persian digits for the Persian locale", () => {
    expect(formatNumber(1234, { locale: "fa" })).toMatch(/[۰-۹]/);
  });

  it("never renders NaN or Infinity", () => {
    expect(formatNumber(Number.NaN, { locale: "en" })).toBe("0");
    expect(formatNumber(Number.POSITIVE_INFINITY, { locale: "en" })).toBe("0");
  });

  it("honours fraction digit options", () => {
    expect(formatNumber(1234.567, { locale: "en", maximumFractionDigits: 2 })).toBe("1,234.57");
  });
});

describe("formatCurrency", () => {
  it("appends the locale currency label to plain integers", () => {
    expect(formatCurrency(1000, { locale: "en" })).toBe("1,000 IRR");
    expect(formatCurrency(1000, { locale: "en", withLabel: false })).toBe("1,000");
  });

  it("uses Toman for Persian and supports compact notation", () => {
    expect(formatCurrency(1_000_000, { locale: "fa" })).toContain("تومان");
    expect(formatCurrency(1_500_000, { locale: "en", compact: true })).toMatch(/M/);
  });
});

describe("formatPercent / formatRatio", () => {
  it("formats a ratio as a percentage", () => {
    expect(formatPercent(0.42, { locale: "en" })).toBe("42%");
    expect(formatPercent(0.4, { locale: "en", fractionDigits: 1 })).toBe("40.0%");
  });

  it("joins a ratio with a locale-aware separator", () => {
    expect(formatRatio(3, 10, "en")).toBe("3 of 10");
    expect(formatRatio(3, 10, "fa")).toContain(" از ");
  });
});

describe("formatDigits / formatCompact / toDigitArray", () => {
  it("formats codes with the active locale digits", () => {
    setActiveLocale("fa");
    expect(formatDigits("0912")).toBe("۰۹۱۲");
    setActiveLocale("en");
    expect(formatDigits("0912")).toBe("0912");
  });

  it("compacts large numbers for dashboards", () => {
    expect(formatCompact(1_500_000, "en")).toMatch(/M$/);
  });

  it("splits values into digits for animation", () => {
    expect(toDigitArray(123)).toEqual(["1", "2", "3"]);
  });
});
