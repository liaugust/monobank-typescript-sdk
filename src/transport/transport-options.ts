import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import type { FetchLike } from "./fetch-like.js";
import type { RetryOptions } from "./retry-options.js";

export interface TransportOptions {
  readonly authenticatedPathPrefix?: "/api/merchant/" | "/personal/";
  readonly baseUrl?: string;
  readonly fetch?: FetchLike;
  readonly retry?: RetryOptions;
  readonly timeoutMs?: number;
  readonly token?: string;
}

export interface StoredTransportOptions {
  readonly authenticatedPathPrefix: "/api/merchant/" | "/personal/";
  readonly baseUrl: URL;
  readonly fetch: FetchLike;
  readonly retry?: RetryOptions;
  readonly timeoutMs: number;
  readonly token?: string;
}

const defaultBaseUrl = "https://api.monobank.ua";
const defaultTimeoutMs = 10_000;

export function validateTransportOptions(
  options: TransportOptions,
): StoredTransportOptions {
  const retry = options.retry;

  return {
    authenticatedPathPrefix: options.authenticatedPathPrefix ?? "/personal/",
    baseUrl: validateBaseUrl(options.baseUrl ?? defaultBaseUrl),
    fetch: options.fetch ?? validateGlobalFetch(),
    timeoutMs: validateTimeout(options.timeoutMs ?? defaultTimeoutMs),
    ...(options.token === undefined
      ? {}
      : { token: validateToken(options.token) }),
    ...(retry === undefined ? {} : { retry: validateRetry(retry) }),
  };
}

function validateToken(token: string): string {
  if (token.length === 0 || token !== token.trim()) {
    throw new MonobankValidationError({
      issues: [
        "token must be a non-empty string without surrounding whitespace",
      ],
      message: "Invalid Monobank transport configuration.",
    });
  }

  return token;
}

function validateBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MonobankValidationError({
      issues: ["baseUrl must be an absolute HTTP(S) URL"],
      message: "Invalid Monobank transport configuration.",
    });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new MonobankValidationError({
      issues: ["baseUrl must be an absolute HTTP(S) URL"],
      message: "Invalid Monobank transport configuration.",
    });
  }

  return url;
}

function validateGlobalFetch(): FetchLike {
  if (typeof globalThis.fetch !== "function") {
    throw new MonobankValidationError({
      issues: ["fetch must be provided when globalThis.fetch is unavailable"],
      message: "Invalid Monobank transport configuration.",
    });
  }

  return globalThis.fetch.bind(globalThis);
}

function validateTimeout(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new MonobankValidationError({
      issues: ["timeoutMs must be a positive finite number"],
      message: "Invalid Monobank transport configuration.",
    });
  }

  return value;
}

function validateRetry(retry: RetryOptions): RetryOptions {
  const issues: string[] = [];

  if (!Number.isInteger(retry.maxAttempts) || retry.maxAttempts < 1) {
    issues.push("retry.maxAttempts must be a positive integer");
  }

  if (!Number.isFinite(retry.baseDelayMs) || retry.baseDelayMs <= 0) {
    issues.push("retry.baseDelayMs must be a positive finite number");
  }

  if (!Number.isFinite(retry.maxDelayMs) || retry.maxDelayMs <= 0) {
    issues.push("retry.maxDelayMs must be a positive finite number");
  }

  if (retry.maxDelayMs < retry.baseDelayMs) {
    issues.push(
      "retry.maxDelayMs must be greater than or equal to baseDelayMs",
    );
  }

  if (issues.length > 0) {
    throw new MonobankValidationError({
      issues,
      message: "Invalid Monobank transport configuration.",
    });
  }

  return { ...retry };
}
