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

  // A token travels in the X-Token header on every authenticated request, so a
  // cleartext origin would put the credential on the wire. Loopback stays
  // allowed because it never leaves the machine, which keeps local proxies and
  // contract tests workable.
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

// Deliberately narrower than the W3C "potentially trustworthy origin" set,
// which also trusts `*.localhost`. Browsers can afford that because they
// resolve `*.localhost` to loopback in the network stack; Node hands the name
// to the OS resolver, so on a runtime without RFC 6761 support `evil.localhost`
// is an ordinary DNS lookup and the token would leave the machine.
function isLoopbackHost(hostname: string): boolean {
  const bracketless =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  // A trailing root dot names the same host: `localhost.` resolves to loopback.
  const host = bracketless.endsWith(".")
    ? bracketless.slice(0, -1)
    : bracketless;

  if (host === "localhost" || host === "::1") {
    return true;
  }

  const octets = host.split(".");

  // The range check is redundant while `hostname` comes from a WHATWG URL,
  // which canonicalizes IPv4 and rejects out-of-range octets outright. It stays
  // as defence in depth for a runtime whose URL implementation does not.
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
