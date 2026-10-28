import { toLatinDigits } from "./format/numbers";

// Re-exported so form modules have a single import for validation helpers.
export { parseNumeric } from "./format/numbers";

/**
 * Validation rules shared by every form and by the client-side consistency
 * checker in the transaction store. Keeping them in one module means the
 * "Consistency" guarantee of the write pipeline cannot drift from the forms.
 */

const IRAN_MOBILE = /^09\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizePhone(value: string): string {
  return toLatinDigits(value ?? "")
    .replace(/[\s-()]/g, "")
    .replace(/^(\+98|0098|98)/, "0")
    .trim();
}

export function isIranianMobile(value: string): boolean {
  return IRAN_MOBILE.test(normalizePhone(value));
}

export function isEmail(value: string): boolean {
  return EMAIL.test((value ?? "").trim());
}

export function isPositiveNumber(value: unknown): boolean {
  const numeric = typeof value === "number" ? value : Number(toLatinDigits(String(value ?? "")));
  return Number.isFinite(numeric) && numeric > 0;
}

export function isFutureDate(value: string | Date): boolean {
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

export function hasMinLength(value: string, min: number): boolean {
  return (value ?? "").trim().length >= min;
}

export const MIN_TITLE_LENGTH = 10;
export const MIN_DESCRIPTION_LENGTH = 15;
export const MIN_PROPOSAL_DESCRIPTION_LENGTH = 10;

/** Budget sanity bounds, also used by the "what-if" simulator. */
export const BUDGET_BOUNDS = {
  min: 500_000,
  max: 2_000_000_000,
  step: 500_000,
} as const;

export const DURATION_BOUNDS = { min: 1, max: 365 } as const;

export interface ValidationIssue {
  field: string;
  messageKey: string;
  params?: Record<string, string | number>;
}

/**
 * Validates a project payload before it is optimistically written to the cache.
 * Returns an empty array when the payload is consistent.
 */
export function validateProjectPayload(payload: {
  title?: string;
  description?: string;
  budget?: number | string;
  deadline?: string;
  category?: string;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!hasMinLength(payload.title ?? "", MIN_TITLE_LENGTH)) {
    issues.push({ field: "title", messageKey: "validation.title.min", params: { min: MIN_TITLE_LENGTH } });
  }
  if (!hasMinLength(payload.description ?? "", MIN_DESCRIPTION_LENGTH)) {
    issues.push({
      field: "description",
      messageKey: "validation.description.min",
      params: { min: MIN_DESCRIPTION_LENGTH },
    });
  }
  if (!isPositiveNumber(payload.budget)) {
    issues.push({ field: "budget", messageKey: "validation.budget.positive" });
  }
  if (!payload.category) {
    issues.push({ field: "category", messageKey: "validation.category.required" });
  }
  if (!payload.deadline || !isFutureDate(payload.deadline)) {
    issues.push({ field: "deadline", messageKey: "validation.deadline.future" });
  }
  return issues;
}

export function validateProposalPayload(payload: {
  description?: string;
  price?: number | string;
  duration?: number | string;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!hasMinLength(payload.description ?? "", MIN_PROPOSAL_DESCRIPTION_LENGTH)) {
    issues.push({
      field: "description",
      messageKey: "validation.description.min",
      params: { min: MIN_PROPOSAL_DESCRIPTION_LENGTH },
    });
  }
  if (!isPositiveNumber(payload.price)) {
    issues.push({ field: "price", messageKey: "validation.price.positive" });
  }
  const duration = Number(payload.duration);
  if (
    !Number.isFinite(duration) ||
    duration < DURATION_BOUNDS.min ||
    duration > DURATION_BOUNDS.max
  ) {
    issues.push({
      field: "duration",
      messageKey: "validation.duration.range",
      params: { min: DURATION_BOUNDS.min, max: DURATION_BOUNDS.max },
    });
  }
  return issues;
}
