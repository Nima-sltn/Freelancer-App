import { describe, expect, it } from "vitest";
import { daysFromNow } from "@/test/factories";
import {
  BUDGET_BOUNDS,
  DURATION_BOUNDS,
  hasMinLength,
  isEmail,
  isFutureDate,
  isIranianMobile,
  isPositiveNumber,
  normalizePhone,
  parseNumeric,
  validateProjectPayload,
  validateProposalPayload,
} from "./validators";

describe("normalizePhone", () => {
  it("normalises local, international and spaced formats", () => {
    expect(normalizePhone("09120000001")).toBe("09120000001");
    expect(normalizePhone("+98 912 000 0001")).toBe("09120000001");
    expect(normalizePhone("00989120000001")).toBe("09120000001");
    expect(normalizePhone("(0912) 000-0001")).toBe("09120000001");
  });

  it("accepts Persian digits", () => {
    expect(normalizePhone("۰۹۱۲۰۰۰۰۰۰۱")).toBe("09120000001");
  });
});

describe("phone and email rules", () => {
  it("validates Iranian mobile numbers", () => {
    expect(isIranianMobile("09120000001")).toBe(true);
    expect(isIranianMobile("+989120000001")).toBe(true);
    expect(isIranianMobile("08120000001")).toBe(false);
    expect(isIranianMobile("0912000000")).toBe(false);
  });

  it("validates email addresses", () => {
    expect(isEmail("nima@example.com")).toBe(true);
    expect(isEmail("nima@example")).toBe(false);
    expect(isEmail("nima example.com")).toBe(false);
  });

  it("validates positive numbers including Persian digits", () => {
    expect(isPositiveNumber("۱۲۳")).toBe(true);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-5)).toBe(false);
    expect(isPositiveNumber("abc")).toBe(false);
  });

  it("re-exports the numeric parser so forms share one implementation", () => {
    expect(parseNumeric("۱۲٬۵۰۰")).toBe(12500);
  });

  it("detects future dates", () => {
    expect(isFutureDate(daysFromNow(3))).toBe(true);
    expect(isFutureDate(daysFromNow(-1))).toBe(false);
    expect(isFutureDate("nonsense")).toBe(false);
  });
});

describe("validateProjectPayload", () => {
  const valid = {
    title: "بازطراحی فروشگاه اینترنتی",
    description: "بازطراحی کامل رابط کاربری فروشگاه اینترنتی با React.",
    budget: 40_000_000,
    deadline: daysFromNow(20),
    category: "cat-1",
  };

  it("returns no issues for a consistent payload", () => {
    expect(validateProjectPayload(valid)).toEqual([]);
  });

  it("reports every offending field", () => {
    const issues = validateProjectPayload({
      title: "کوتاه",
      description: "",
      budget: 0,
      deadline: daysFromNow(-2),
      category: "",
    });
    expect(issues.map((issue) => issue.field).sort()).toEqual([
      "budget",
      "category",
      "deadline",
      "description",
      "title",
    ]);
    expect(issues.every((issue) => issue.messageKey.startsWith("validation."))).toBe(true);
  });

  it("keeps the reported bounds in sync with the exported constants", () => {
    const [titleIssue] = validateProjectPayload({ ...valid, title: "کوتاه" });
    expect(titleIssue.params).toEqual({ min: 10 });
    expect(BUDGET_BOUNDS.min).toBeLessThan(BUDGET_BOUNDS.max);
  });
});

describe("validateProposalPayload", () => {
  const valid = { description: "اجرای پروژه با تیمی سه نفره.", price: 30_000_000, duration: 30 };

  it("accepts a consistent proposal", () => {
    expect(validateProposalPayload(valid)).toEqual([]);
  });

  it("rejects a short description, a zero price and a wild duration", () => {
    const issues = validateProposalPayload({ description: "کم", price: 0, duration: 999 });
    expect(issues.map((issue) => issue.field).sort()).toEqual([
      "description",
      "duration",
      "price",
    ]);
    expect(issues.find((issue) => issue.field === "duration")?.params).toEqual({
      min: DURATION_BOUNDS.min,
      max: DURATION_BOUNDS.max,
    });
  });
});

describe("hasMinLength", () => {
  it("ignores surrounding whitespace", () => {
    expect(hasMinLength("   abcd   ", 4)).toBe(true);
    expect(hasMinLength("abc", 4)).toBe(false);
    expect(hasMinLength(undefined as unknown as string, 1)).toBe(false);
  });
});
