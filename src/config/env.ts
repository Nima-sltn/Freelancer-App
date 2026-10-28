/**
 * Single source of truth for every environment-driven decision.
 *
 * Nothing else in the codebase should touch `import.meta.env` directly: keeping
 * the reads here means the runtime contract is typed, documented and trivially
 * mockable in tests (see `src/test/setup.ts`).
 */

export type ApiMode = "live" | "mock";

const raw = import.meta.env ?? {};

function readString(key: keyof ImportMetaEnv, fallback: string): string {
  const value = raw[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readBoolean(key: keyof ImportMetaEnv, fallback: boolean): boolean {
  const value = raw[key];
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

function readNumber(key: keyof ImportMetaEnv, fallback: number): number {
  const value = Number(raw[key]);
  return Number.isFinite(value) ? value : fallback;
}

function readApiMode(): ApiMode {
  if (typeof window !== "undefined") {
    try {
      const urlParam = new URLSearchParams(window.location.search).get("api");
      if (urlParam === "live" || urlParam === "mock") return urlParam;

      const stored = window.localStorage.getItem("fh.api_mode");
      if (stored === "live" || stored === "mock") return stored;
    } catch {
      // ignore security or storage errors
    }
  }
  return readString("VITE_API_MODE", "live") as ApiMode;
}

const apiMode = readApiMode();

export const env = {
  /** Base URL for every API call. The dev server proxies `/api` (see vite.config.js). */
  apiUrl: readString("VITE_API_URL", "/api"),
  /** `live` talks to Express + MongoDB, `mock` serves a seeded in-browser dataset. */
  apiMode,
  /** True when requests are answered by the demo adapter. */
  useMocks: apiMode === "mock",
  /** Artificial latency for the mock adapter so optimistic UI is observable. */
  mockLatency: readNumber("VITE_MOCK_LATENCY", 320),
  /** Milliseconds before an API call is aborted. */
  requestTimeout: readNumber("VITE_REQUEST_TIMEOUT", 20000),

  flags: {
    devtools: readBoolean("VITE_ENABLE_DEVTOOLS", import.meta.env?.DEV ?? false),
    serviceWorker: readBoolean("VITE_ENABLE_SERVICE_WORKER", false),
    realtime: readBoolean("VITE_ENABLE_REALTIME", true),
  },

  isDev: Boolean(import.meta.env?.DEV),
  isProd: Boolean(import.meta.env?.PROD),
} as const;

export const APP_META = {
  name: "FreelanceHub",
  nameFa: "فریلنس‌هاب",
  version: "2.0.0",
  supportEmail: "support@freelancehub.local",
} as const;
