/**
 * Lightweight native Web Vitals and Performance Observer (Layer 1 - pure TS).
 *
 * Uses the browser PerformanceObserver API without heavy third-party dependencies.
 * Tracks Core Web Vitals (LCP, FID/INP, CLS) and diagnostic metrics (FCP, TTFB).
 */

export type MetricRating = "good" | "needs-improvement" | "poor";

export interface WebVitalMetric {
  name: "LCP" | "FID" | "CLS" | "FCP" | "TTFB" | "INP";
  value: number;
  rating: MetricRating;
  delta: number;
  timestamp: number;
}

export type WebVitalsReport = Record<string, WebVitalMetric>;

type MetricCallback = (metric: WebVitalMetric) => void;

const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

const store: WebVitalsReport = {};
const listeners = new Set<MetricCallback>();
let initialized = false;

export function getMetricRating(name: string, value: number): MetricRating {
  const [good, poor] = THRESHOLDS[name] ?? [1000, 3000];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function recordMetric(name: WebVitalMetric["name"], value: number): void {
  const rounded = Math.round(value * 100) / 100;
  const rating = getMetricRating(name, rounded);
  const metric: WebVitalMetric = {
    name,
    value: rounded,
    rating,
    delta: rounded,
    timestamp: Date.now(),
  };

  store[name] = metric;
  listeners.forEach((fn) => {
    try {
      fn(metric);
    } catch {
      // ignore listener error
    }
  });
}

/**
 * Initializes observers for Core Web Vitals.
 */
export function initWebVitals(): void {
  if (initialized || typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return;
  }
  initialized = true;

  // 1. Navigation Timing (TTFB)
  try {
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      const ttfb = nav.responseStart - nav.requestStart;
      if (ttfb >= 0) recordMetric("TTFB", ttfb);
    }
  } catch {
    // fallback
  }

  // 2. Paint Timing (FCP)
  try {
    const paintObserver = new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry) => {
        if (entry.name === "first-contentful-paint") {
          recordMetric("FCP", entry.startTime);
        }
      });
    });
    paintObserver.observe({ type: "paint", buffered: true });
  } catch {
    // ignore
  }

  // 3. Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const last = entries[entries.length - 1];
        recordMetric("LCP", last.startTime);
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // ignore
  }

  // 4. Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry) => {
        const shift = entry as unknown as { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput && typeof shift.value === "number") {
          clsValue += shift.value;
          recordMetric("CLS", clsValue);
        }
      });
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // ignore
  }

  // 5. First Input Delay (FID)
  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const first = entries[0] as unknown as { processingStart?: number; startTime?: number };
        if (typeof first.processingStart === "number" && typeof first.startTime === "number") {
          const delay = first.processingStart - first.startTime;
          recordMetric("FID", delay);
        }
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch {
    // ignore
  }
}

/**
 * Returns a snapshot of all currently recorded Web Vitals.
 */
export function getWebVitals(): WebVitalsReport {
  return { ...store };
}

/**
 * Subscribes to metric updates.
 */
export function onWebVital(callback: MetricCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
