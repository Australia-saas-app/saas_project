/**
 * Centralized API error handling.
 *
 * Usage:
 *   import { parseApiError } from "@/src/lib/api-error";
 *   const msg = parseApiError(error);
 *   toast.error(msg);
 */

export interface FieldError {
  path: string;
  message: string;
}

/**
 * Structured API error with HTTP status, human-readable message, and optional field errors.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly fieldErrors: FieldError[];

  constructor(message: string, status = 0, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type RawError = {
  code?: string;
  name?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
      errorSources?: Array<{ path?: string; message?: string }>;
    };
  };
  message?: string;
};

export const AUTH_MESSAGES = {
  invalidCredentials: "Invalid email or password. Please try again.",
  serviceUnavailable: "Authentication service is temporarily unavailable. Please try again later.",
  loginFailed: "Login failed. Please try again.",
  resetFailed: "Failed to send reset code. Please try again.",
  passwordResetFailed: "Failed to reset password. Please try again.",
} as const;

export function isNetworkOrTimeoutError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 0;
  const err = error as RawError;
  if (err?.response) return false;

  const message = (err?.message ?? "").toLowerCase();
  return (
    err?.code === "ECONNABORTED" ||
    err?.code === "ERR_NETWORK" ||
    err?.code === "ENOTFOUND" ||
    err?.code === "ECONNREFUSED" ||
    err?.name === "TimeoutError" ||
    err?.name === "AbortError" ||
    message.includes("timeout") ||
    message.includes("network error") ||
    message.includes("fetch failed") ||
    message.includes("connect timeout")
  );
}

export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 401 || error.status === 403;
  const status = (error as RawError)?.response?.status;
  return status === 401 || status === 403;
}

export function getLoginErrorMessage(error: unknown): string {
  const parsed = parseApiError(error, AUTH_MESSAGES.loginFailed);
  if (parsed.toLowerCase().includes("otp") || parsed.toLowerCase().includes("verification") || parsed.toLowerCase().includes("code")) {
    return parsed;
  }

  if (isUnauthorizedError(error)) {
    return AUTH_MESSAGES.invalidCredentials;
  }

  if (isNetworkOrTimeoutError(error)) {
    return AUTH_MESSAGES.invalidCredentials;
  }

  const status = (error as RawError)?.response?.status;
  if (status && status >= 500) {
    return AUTH_MESSAGES.serviceUnavailable;
  }

  if (parsed.toLowerCase().includes("timeout")) {
    return AUTH_MESSAGES.invalidCredentials;
  }

  return parsed;
}

/**
 * Convert any thrown error (axios, fetch, unknown) into a human-readable string.
 * Never exposes internal server details.
 */
export function parseApiError(error: unknown, fallback = "An unexpected error occurred"): string {
  if (error instanceof ApiError) {
    const fields = error.fieldErrors
      .map((e) => (e.path ? `${e.path}: ${e.message}` : e.message))
      .join(", ");
    const message = error.message || fallback;
    return fields ? `${message} – ${fields}` : message;
  }

  const err = error as RawError;

  let baseMessage = err?.response?.data?.message || err?.message || fallback;
  if (Array.isArray(baseMessage)) {
    baseMessage = baseMessage.join(", ");
  } else if (typeof baseMessage !== "string") {
    baseMessage = String(baseMessage);
  }

  const fieldErrors = err?.response?.data?.errorSources
    ?.filter((e) => e.message)
    .map((e) => (e.path ? `${e.path}: ${e.message}` : e.message!))
    .join(", ");

  return fieldErrors ? `${baseMessage} – ${fieldErrors}` : (baseMessage as string);
}

/**
 * Convert any thrown error into an ApiError instance.
 */
export function toApiError(error: unknown, fallback = "An unexpected error occurred"): ApiError {
  if (error instanceof ApiError) return error;
  const err = error as RawError;
  const status = err?.response?.status ?? 0;
  const message = err?.response?.data?.message || err?.message || fallback;
  const fieldErrors: FieldError[] =
    err?.response?.data?.errorSources
      ?.filter((e) => e.message)
      .map((e) => ({ path: e.path ?? "", message: e.message! })) ?? [];

  return new ApiError(message, status, fieldErrors);
}
