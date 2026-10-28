/**
 * Application performance budget and Web Vitals thresholds.
 *
 * Enforces client-side performance targets:
 *  - Bundle & chunk sizes to constrain initial parse/compile overhead
 *  - Core Web Vitals (LCP, FID, CLS, TTFB)
 *  - DOM complexity and network request count bounds
 */

export const PERFORMANCE_BUDGET = {
  /** Maximum total production bundle size in kilobytes */
  maxBundleSizeKB: 500,
  /** Maximum single JS/CSS vendor or app chunk size in kilobytes */
  maxChunkSizeKB: 150,
  /** Maximum single image asset size in kilobytes */
  maxImageSizeKB: 200,
  /** Largest Contentful Paint target in milliseconds (WCAG & Core Web Vitals Good: <= 2500ms) */
  targetLCP: 2500,
  /** First Input Delay target in milliseconds (Core Web Vitals Good: <= 100ms) */
  targetFID: 100,
  /** Cumulative Layout Shift target score (Core Web Vitals Good: <= 0.1) */
  targetCLS: 0.1,
  /** Time to First Byte target in milliseconds */
  targetTTFB: 800,
  /** Maximum recommended DOM node count to prevent memory and layout degradation */
  maxDOMNodes: 1500,
  /** Maximum total HTTP requests per initial route page load */
  maxRequestsPerPage: 20,
} as const;

export type PerformanceBudget = typeof PERFORMANCE_BUDGET;
export type PerformanceMetricKey = keyof PerformanceBudget;

/**
 * Evaluates whether a measured runtime metric is within the configured budget threshold.
 */
export function isWithinPerformanceBudget(
  metric: PerformanceMetricKey,
  measuredValue: number
): boolean {
  const threshold = PERFORMANCE_BUDGET[metric];
  return measuredValue <= threshold;
}
