import type { MonobankApiError } from "../../errors/monobank-api-error.js";
import type { MonobankNetworkError } from "../../errors/monobank-network-error.js";
import type { EmptyRequest } from "../request/request.js";
import type { RetryOptions } from "../retry-options.js";

const retryableStatusCodes = new Set([429, 500, 502, 503, 504]);

export function retryDelayForApiError(
  error: MonobankApiError,
  method: "GET" | "POST",
  request: EmptyRequest,
  policy: RetryOptions | undefined,
  attempt: number,
): number | undefined {
  if (
    !canRetryRequest(method, request, policy, attempt) ||
    !retryableStatusCodes.has(error.status)
  ) {
    return undefined;
  }

  return retryDelayMs(attempt, error.retryAfterMs, policy);
}

export function retryDelayForNetworkError(
  error: MonobankNetworkError,
  method: "GET" | "POST",
  request: EmptyRequest,
  policy: RetryOptions | undefined,
  attempt: number,
): number | undefined {
  if (
    error.reason !== "network" ||
    !canRetryRequest(method, request, policy, attempt)
  ) {
    return undefined;
  }

  return retryDelayMs(attempt, undefined, policy);
}

function canRetryRequest(
  method: "GET" | "POST",
  request: EmptyRequest,
  policy: RetryOptions | undefined,
  attempt: number,
): policy is RetryOptions {
  return (
    request.retryable === true &&
    policy !== undefined &&
    method === "GET" &&
    attempt < policy.maxAttempts
  );
}

function retryDelayMs(
  attempt: number,
  retryAfterMs: number | undefined,
  policy: RetryOptions,
): number | undefined {
  if (retryAfterMs !== undefined) {
    return retryAfterMs <= policy.maxDelayMs ? retryAfterMs : undefined;
  }

  return Math.min(policy.baseDelayMs * 2 ** (attempt - 1), policy.maxDelayMs);
}
