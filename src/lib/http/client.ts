import axios, { AxiosHeaders, type AxiosAdapter, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import queryString from "query-string";
import { env } from "@/config/env";
import { APP_EVENTS, appEvents } from "@/lib/eventBus";
import { ApiError, normalizeError } from "./errors";

/**
 * The HTTP layer.
 *
 * Responsibilities:
 *  - one configured axios instance (base URL from `VITE_API_URL`, cookies on)
 *  - comma-joined array params, which is what the Express list endpoints parse
 *  - a single-flight refresh-token flow (the old implementation raced and used
 *    the wrong path: `/use/refresh-token`)
 *  - normalised `ApiError`s with offline detection
 *  - a pluggable transport: in `mock` mode the same instance is answered by the
 *    in-browser demo adapter, so no service or component needs to know
 */

/** Endpoints that must never trigger a token refresh. */
const AUTH_FREE_PATHS = ["/user/get-otp", "/user/check-otp", "/user/refresh-token", "/user/logout"];

const REFRESH_PATH = "/user/refresh-token";

function isAuthFree(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_FREE_PATHS.some((path) => url.includes(path));
}

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  timeout: env.requestTimeout,
  paramsSerializer: {
    serialize: (params) =>
      queryString.stringify(params as Record<string, unknown>, {
        arrayFormat: "comma",
        skipEmptyString: true,
        skipNull: true,
      }),
  },
});

/* -------------------------------------------------------------------------- */
/* Request pipeline                                                           */
/* -------------------------------------------------------------------------- */

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(config.headers);
  headers.set("Accept", "application/json");
  // Marks the request so the response interceptor can tell mock-served
  // responses apart when debugging the demo mode.
  if (env.useMocks) headers.set("X-Data-Source", "mock");
  config.headers = headers;
  return config;
});

/* -------------------------------------------------------------------------- */
/* Token refresh (single flight)                                              */
/* -------------------------------------------------------------------------- */

let refreshPromise: Promise<void> | null = null;

/** Separate bare client: the refresh call must not run through the interceptor. */
const refreshClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  timeout: env.requestTimeout,
});

/* -------------------------------------------------------------------------- */
/* Mock transport                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Installs a transport on **both** axios instances (the main client and the
 * bare refresh client).
 *
 * The wiring lives here, but the *decision* to install a transport belongs to
 * the composition root: `lib` must not import `mocks` (that would put the demo
 * dataset in the dependency graph of every consumer of the HTTP layer), so
 * demo mode composes them from `mocks/install.ts` instead.
 */
export function installTransport(adapter: AxiosAdapter): void {
  api.defaults.adapter = adapter;
  refreshClient.defaults.adapter = adapter;
}

async function refreshAccessToken(): Promise<void> {
  refreshPromise ??= refreshClient
    .get(REFRESH_PATH)
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

/* -------------------------------------------------------------------------- */
/* Response pipeline                                                          */
/* -------------------------------------------------------------------------- */

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const normalized = normalizeError(error);

    if (normalized.isNetwork) {
      appEvents.emit(APP_EVENTS.networkOffline, normalized);
      return Promise.reject(normalized);
    }

    const config = (error as { config?: InternalAxiosRequestConfig & { _retry?: boolean } })?.config;
    if (!config) {
      return Promise.reject(normalized);
    }

    const retryable = normalized.status === 401 && !config._retry && !isAuthFree(config.url);

    if (retryable) {
      config._retry = true;
      try {
        await refreshAccessToken();
        return api(config);
      } catch (refreshError) {
        appEvents.emit(APP_EVENTS.authExpired);
        return Promise.reject(normalizeError(refreshError));
      }
    }

    if (normalized.status === 401) {
      appEvents.emit(APP_EVENTS.authExpired);
    }

    return Promise.reject(normalized);
  }
);

/** Typed helper that unwraps the API envelope `{ statusCode, data }`. */
export async function request<T>(
  config: Parameters<AxiosInstance["request"]>[0]
): Promise<T> {
  try {
    const response = await api.request<{ statusCode: number; data: T }>(config);
    return response.data?.data as T;
  } catch (error) {
    throw error instanceof ApiError ? error : normalizeError(error);
  }
}

export const http = {
  get: <T>(url: string, config?: Parameters<AxiosInstance["get"]>[1]) =>
    request<T>({ ...config, method: "get", url }),
  post: <T>(url: string, data?: unknown, config?: Parameters<AxiosInstance["post"]>[2]) =>
    request<T>({ ...config, method: "post", url, data }),
  put: <T>(url: string, data?: unknown, config?: Parameters<AxiosInstance["put"]>[2]) =>
    request<T>({ ...config, method: "put", url, data }),
  patch: <T>(url: string, data?: unknown, config?: Parameters<AxiosInstance["patch"]>[2]) =>
    request<T>({ ...config, method: "patch", url, data }),
  delete: <T>(url: string, config?: Parameters<AxiosInstance["delete"]>[1]) =>
    request<T>({ ...config, method: "delete", url }),
};

export { REFRESH_PATH, refreshAccessToken };
export default api;
