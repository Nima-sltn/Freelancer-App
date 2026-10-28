import { AxiosError } from "axios";

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "validation"
  | "server"
  | "unknown";

/**
 * One error shape for the whole app.
 *
 * The previous implementation read `err.response.data.message` in a dozen
 * places, which crashed on network failures (no `response`) and produced
 * `undefined` toasts for unexpected shapes. Everything now converges here.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly payload: unknown;
  readonly originalError?: unknown;

  constructor(config: {
    message: string;
    kind: ApiErrorKind;
    status?: number;
    payload?: unknown;
    originalError?: unknown;
  }) {
    super(config.message);
    this.name = "ApiError";
    this.kind = config.kind;
    this.status = config.status ?? 0;
    this.payload = config.payload;
    this.originalError = config.originalError;
  }

  get isNetwork(): boolean {
    return this.kind === "network" || this.kind === "timeout";
  }
  get isAuth(): boolean {
    return this.kind === "unauthorized";
  }
  get isForbidden(): boolean {
    return this.kind === "forbidden";
  }
  get isServer(): boolean {
    return this.kind === "server";
  }
}

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  network: "اتصال به سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.",
  timeout: "پاسخی از سرور دریافت نشد. دوباره تلاش کنید.",
  unauthorized: "نشست شما منقضی شده است. دوباره وارد شوید.",
  forbidden: "شما اجازهٔ دسترسی به این بخش را ندارید.",
  "not-found": "موردی که درخواست کردید پیدا نشد.",
  validation: "اطلاعات ارسال‌شده معتبر نیست.",
  server: "خطای غیرمنتظره در سرور رخ داد. کمی بعد تلاش کنید.",
  unknown: "خطای نامشخصی رخ داد.",
};

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status >= 400 && status < 500) return "validation";
  if (status >= 500) return "server";
  return "unknown";
}

function extractMessage(data: unknown): string | undefined {
  if (!data) return undefined;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.length > 0) return record.message;
    if (typeof record.error === "string" && record.error.length > 0) return record.error;
    const nested = record.data;
    if (nested && typeof nested === "object") {
      const nestedMessage = (nested as Record<string, unknown>).message;
      if (typeof nestedMessage === "string") return nestedMessage;
    }
  }
  return undefined;
}

/** Converts anything thrown by the HTTP layer into an `ApiError`. */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError({
        message: FALLBACK_MESSAGES.timeout,
        kind: "timeout",
        status: error.response?.status,
        payload: error.response?.data,
        originalError: error,
      });
    }
    if (!error.response) {
      return new ApiError({
        message: FALLBACK_MESSAGES.network,
        kind: "network",
        originalError: error,
      });
    }
    const kind = kindFromStatus(error.response.status);
    return new ApiError({
      message: extractMessage(error.response.data) ?? FALLBACK_MESSAGES[kind],
      kind,
      status: error.response.status,
      payload: error.response.data,
      originalError: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError({ message: error.message, kind: "unknown", originalError: error });
  }

  return new ApiError({ message: FALLBACK_MESSAGES.unknown, kind: "unknown", payload: error });
}
