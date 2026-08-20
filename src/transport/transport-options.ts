import * as z from "zod/mini";

import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import { isPrintableAscii } from "../shared/printable-ascii.js";
import type {
  CorporateCredential,
  CorporateSigner,
} from "./corporate-signer.js";
import type { FetchLike } from "./fetch-like.js";
import type { InstallmentsCredential } from "./installments-credential.js";
import type { RetryOptions } from "./retry-options.js";

export interface TransportOptions {
  readonly authenticatedPathPrefix?: "/api/" | "/api/merchant/" | "/personal/";
  readonly baseUrl?: string;
  readonly corporate?: CorporateCredential;
  readonly fetch?: FetchLike;
  readonly installments?: InstallmentsCredential;
  readonly retry?: RetryOptions;
  readonly timeoutMs?: number;
  readonly token?: string;
}

export interface StoredTransportOptions {
  readonly authenticatedPathPrefix: "/api/" | "/api/merchant/" | "/personal/";
  readonly baseUrl: URL;
  readonly corporate?: CorporateCredential;
  readonly fetch: FetchLike;
  readonly installments?: InstallmentsCredential;
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
  const corporate =
    options.corporate === undefined
      ? undefined
      : validateCorporateCredential(options.corporate);
  const installments =
    options.installments === undefined
      ? undefined
      : validateInstallmentsCredential(options.installments);

  if (
    [token, corporate, installments].filter((value) => value !== undefined)
      .length > 1
  ) {
    throw new MonobankValidationError({
      issues: [
        "token, corporate, and installments must not be configured on the same transport",
      ],
      message: "Invalid Monobank transport configuration.",
    });
  }

  return {
    authenticatedPathPrefix: options.authenticatedPathPrefix ?? "/personal/",
    baseUrl: validateBaseUrl(
      options.baseUrl ?? defaultBaseUrl,
      token !== undefined ||
        corporate !== undefined ||
        installments !== undefined,
    ),
    fetch: options.fetch ?? validateGlobalFetch(),
    timeoutMs: validateTimeout(options.timeoutMs ?? defaultTimeoutMs),
    ...(corporate === undefined ? {} : { corporate }),
    ...(installments === undefined ? {} : { installments }),
    ...(token === undefined ? {} : { token }),
    ...(retry === undefined ? {} : { retry: validateRetry(retry) }),
  };
}

const corporateCredentialSchema = z.object({
  keyId: z.optional(z.string().check(z.refine(isPrintableAscii))),
  sign: z.custom<CorporateSigner>((value) => typeof value === "function"),
});

/**
 * Validates the Corporate key identifier and signer before any request.
 *
 * The identifier is restricted to printable ASCII without spaces because it is
 * sent verbatim as `X-Key-Id`; a control character would otherwise make
 * `Headers.set` throw per request instead of failing once here. A copy is
 * returned so mutating the caller's object cannot bypass this one-time check,
 * matching how the retry policy is stored.
 * @param credential Configured key identifier and signing function.
 * @returns A copy of the validated credential.
 * @throws {MonobankValidationError} When the identifier is unusable as a header value or the signer is not callable.
 */
function validateCorporateCredential(
  credential: CorporateCredential,
): CorporateCredential {
  if (!corporateCredentialSchema.safeParse(credential).success) {
    throw new MonobankValidationError({
      issues: [
        "corporate.keyId must be printable ASCII without spaces, and corporate.sign must be a function",
      ],
      message: "Invalid Monobank transport configuration.",
    });
  }

  return {
    ...(credential.keyId === undefined ? {} : { keyId: credential.keyId }),
    sign: credential.sign,
  };
}

const installmentsCredentialSchema = z.object({
  storeId: z.string().check(z.refine(isPrintableAscii)),
  storeSecret: z.string().check(z.minLength(1)),
});

/**
 * Validates the store identifier and secret before any request.
 *
 * The identifier is restricted to printable ASCII without spaces because it is
 * sent verbatim as `store-id`; a control character would otherwise make
 * `Headers.set` throw per request instead of failing once here. The secret has no
 * such restriction: it is never sent, only used as an HMAC key. A copy is
 * returned so mutating the caller's object cannot bypass this one-time check.
 * @param credential Configured store identifier and secret.
 * @returns A copy of the validated credential.
 * @throws {MonobankValidationError} When the identifier is unusable as a header value or the secret is empty.
 */
function validateInstallmentsCredential(
  credential: InstallmentsCredential,
): InstallmentsCredential {
  if (!installmentsCredentialSchema.safeParse(credential).success) {
    throw new MonobankValidationError({
      issues: [
        "installments.storeId must be printable ASCII without spaces, and installments.storeSecret must be a nonempty string",
      ],
      message: "Invalid Monobank transport configuration.",
    });
  }

  return {
    storeId: credential.storeId,
    storeSecret: credential.storeSecret,
  };
}

/**
 * Validates the configured token before any request.
 *
 * Restricted to printable ASCII without spaces because it is sent verbatim as
 * `X-Token`; a control character would otherwise make `Headers.set` throw a bare
 * `TypeError` per request, which the transport catch would misread as a retryable
 * network failure.
 * @param token Configured Personal or Acquiring token.
 * @returns The unchanged token.
 * @throws {MonobankValidationError} When the token is unusable as a header value.
 */
function validateToken(token: string): string {
  if (!isPrintableAscii(token)) {
    throw new MonobankValidationError({
      issues: ["token must be printable ASCII without spaces"],
      message: "Invalid Monobank transport configuration.",
    });
  }

  return token;
}

/**
 * Validates the configured base URL.
 *
 * Every authenticated request carries a credential on the wire: a token in
 * `X-Token`, a Corporate signature in `X-Sign`, or a store identifier and body
 * signature in `store-id` and `signature`, so a cleartext origin would expose it. Loopback is exempt because that traffic never leaves the machine.
 * @param value Configured base URL.
 * @param hasCredential Whether authenticated requests will carry a credential.
 * @returns The parsed base URL.
 * @throws {MonobankValidationError} When the URL is not absolute HTTP(S), or is cleartext with a credential and a non-loopback host.
 */
function validateBaseUrl(value: string, hasCredential: boolean): URL {
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

  if (
    url.protocol === "http:" &&
    hasCredential &&
    !isLoopbackHost(url.hostname)
  ) {
    throw new MonobankValidationError({
      issues: [
        "baseUrl must use https when a credential is configured, unless it targets a loopback host",
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

function isUsableStatusList(statuses: readonly number[]): boolean {
  return (
    statuses.length > 0 &&
    statuses.every(
      (status) => Number.isInteger(status) && status >= 400 && status <= 599,
    )
  );
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

  if (
    retry.retryableStatusCodes !== undefined &&
    !isUsableStatusList(retry.retryableStatusCodes)
  ) {
    issues.push(
      "retry.retryableStatusCodes must be a non-empty list of integer HTTP status codes between 400 and 599",
    );
  }

  if (issues.length > 0) {
    throw new MonobankValidationError({
      issues,
      message: "Invalid Monobank transport configuration.",
    });
  }

  return {
    ...retry,
    ...(retry.retryableStatusCodes === undefined
      ? {}
      : { retryableStatusCodes: [...retry.retryableStatusCodes] }),
  };
}
