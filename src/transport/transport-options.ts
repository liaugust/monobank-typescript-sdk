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
  const token =
    options.token === undefined ? undefined : validateToken(options.token);

  return {
    authenticatedPathPrefix: options.authenticatedPathPrefix ?? "/personal/",
    baseUrl: validateBaseUrl(
      options.baseUrl ?? defaultBaseUrl,
      token !== undefined,
    ),
    fetch: options.fetch ?? validateGlobalFetch(),
    timeoutMs: validateTimeout(options.timeoutMs ?? defaultTimeoutMs),
    ...(token === undefined ? {} : { token }),
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

/**
 * Validates the configured base URL.
 *
 * A token is sent in the `X-Token` header on every authenticated request, so a
 * cleartext origin would put the credential on the wire. Loopback is exempt
 * because that traffic never leaves the machine.
 * @param value Configured base URL.
 * @param hasToken Whether authenticated requests will carry a token.
 * @returns The parsed base URL.
 * @throws {MonobankValidationError} When the URL is not absolute HTTP(S), or is cleartext with a token and a non-loopback host.
 */
function validateBaseUrl(value: string, hasToken: boolean): URL {
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

  if (url.protocol === "http:" && hasToken && !isLoopbackHost(url.hostname)) {
    throw new MonobankValidationError({
      issues: [
        "baseUrl must use https when a token is configured, unless it targets a loopback host",
      ],
      message: "Invalid Monobank transport configuration.",
    });
  }

  return url;
}

/**
 * Reports whether a parsed hostname addresses the local machine.
 *
 * Narrower than the W3C potentially-trustworthy origin set, which also trusts
 * `*.localhost`. Browsers resolve `*.localhost` to loopback inside the network
 * stack, while Node defers to the OS resolver, so `evil.test.localhost` can
 * leave the machine and must not be trusted here.
 * @param hostname Canonical `URL.hostname`, which excludes any userinfo.
 * @returns True only for `localhost`, `127.0.0.0/8`, and `::1`.
 */
function isLoopbackHost(hostname: string): boolean {
  const bracketless =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  const host = bracketless.endsWith(".")
    ? bracketless.slice(0, -1)
    : bracketless;

  if (host === "localhost" || host === "::1") {
    return true;
  }

  const octets = host.split(".");

  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
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
