import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import type {
  CorporateSignatureInput,
  CorporateSigner,
} from "../corporate-signer.js";
import type { ResponseSchema } from "../response-schema.js";
import type { StoredTransportOptions } from "../transport-options.js";
import type { CorporateSignatureSpec } from "./corporate-signature.js";
import { createCorporateSignatureInput } from "./corporate-signature.js";
import { createInstallmentsSignature } from "./installments-signature.js";

export interface JsonRequest<T> extends EmptyRequest {
  readonly schema: ResponseSchema<T>;
}

export interface EmptyRequest {
  readonly auth: boolean;
  readonly body?: unknown;
  readonly endpoint: string;
  readonly headers?: HeadersInit;
  readonly retryable?: boolean;
  readonly signature?: CorporateSignatureSpec;
  readonly signal?: AbortSignal;
}

/**
 * Validates the endpoint and resolves it against the configured base URL.
 *
 * Runs once per request, so a malformed endpoint fails before any Fetch and
 * before a signer is invoked.
 * @param request Endpoint and authentication inputs.
 * @param options Validated transport configuration.
 * @returns Absolute request URL.
 * @throws {MonobankValidationError} When the endpoint escapes the base URL or targets the wrong authenticated prefix.
 */
export function resolveRequestUrl(
  request: EmptyRequest,
  options: StoredTransportOptions,
): URL {
  return validateEndpointUrl(
    request.endpoint,
    options.baseUrl,
    request.auth,
    options.authenticatedPathPrefix,
  );
}

/**
 * Builds the Fetch init for one request attempt.
 *
 * Per attempt, because a Corporate signature covers `X-Time` and a retry must be
 * signed again rather than replay a stale timestamp.
 *
 * Redirects are refused because only the initial URL was validated: Fetch keeps
 * custom headers such as `X-Token` across a cross-origin redirect and replays the
 * method and body on 307/308, so following one would send the credential, and
 * repeat a mutation, at an unchecked origin.
 * @param method HTTP method for the request.
 * @param request Authentication, body, signature, and cancellation inputs.
 * @param options Validated transport configuration.
 * @param url Absolute request URL from `resolveRequestUrl`.
 * @param attemptSignal Signal aborting this attempt on timeout or caller cancellation, which also bounds the signer.
 * @returns Fetch init carrying credential headers for this attempt.
 * @throws {MonobankValidationError} When the request needs a credential that is not configured, or the Corporate signer fails.
 */
export async function createRequestInit(
  method: "DELETE" | "GET" | "POST",
  request: EmptyRequest,
  options: StoredTransportOptions,
  url: URL,
  attemptSignal: AbortSignal,
): Promise<RequestInit> {
  const headers = new Headers(request.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const body =
    request.body === undefined ? undefined : JSON.stringify(request.body);

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (request.auth) {
    await applyCredentialHeaders(
      headers,
      request,
      options,
      url,
      attemptSignal,
      body,
    );
  }

  const init: RequestInit = { headers, method, redirect: "error" };

  if (request.signal !== undefined) {
    init.signal = request.signal;
  }

  if (body !== undefined) {
    init.body = body;
  }

  return init;
}

async function applyCredentialHeaders(
  headers: Headers,
  request: EmptyRequest,
  options: StoredTransportOptions,
  url: URL,
  attemptSignal: AbortSignal,
  body: string | undefined,
): Promise<void> {
  const installments = options.installments;

  if (installments !== undefined) {
    headers.set(
      "store-id",
      requireSafeHeaderValue(installments.storeId, "storeId", request.endpoint),
    );
    headers.set(
      "signature",
      await createInstallmentsSignature(installments.storeSecret, body ?? ""),
    );

    return;
  }

  const corporate = options.corporate;

  if (corporate === undefined) {
    headers.set(
      "X-Token",
      requireAuthenticatedToken(options.token, request.endpoint),
    );

    return;
  }

  const spec = request.signature;

  if (spec === undefined) {
    throw new MonobankValidationError({
      endpoint: request.endpoint,
      issues: ["corporate requests must declare a signed payload variant"],
      message: "Invalid Monobank transport request.",
    });
  }

  const time = Math.floor(Date.now() / 1_000).toString();
  const input = createCorporateSignatureInput(spec, time, url);

  if (input.requestId !== undefined) {
    headers.set(
      "X-Request-Id",
      requireSafeHeaderValue(input.requestId, "requestId", request.endpoint),
    );
  }

  if (spec.preRegistration !== true) {
    headers.set("X-Key-Id", requireKeyId(corporate.keyId, request.endpoint));
  }

  headers.set("X-Time", time);
  headers.set(
    "X-Sign",
    requireSafeHeaderValue(
      await createSignature(
        corporate.sign,
        input,
        request.endpoint,
        attemptSignal,
      ),
      "signature",
      request.endpoint,
    ),
  );
}

const safeHeaderValue = /^[!-~]+$/u;

/**
 * Rejects a credential header value that cannot be sent verbatim.
 *
 * `Headers.set` throws a bare `TypeError` on a control character, which the
 * transport catch would misread as a retryable network failure, and an empty
 * value would silently send a blank header. Failing here names the offending
 * field before any request is made.
 * @param value Candidate header value.
 * @param field Name of the input that produced it.
 * @param endpoint Endpoint the header was built for.
 * @returns The unchanged value.
 * @throws {MonobankValidationError} When the value is empty or not printable ASCII without spaces.
 */
function requireSafeHeaderValue(
  value: string,
  field: string,
  endpoint: string,
): string {
  if (!safeHeaderValue.test(value)) {
    throw new MonobankValidationError({
      endpoint,
      issues: [`${field} must be nonempty printable ASCII without spaces`],
      message: "Invalid Monobank transport request.",
    });
  }

  return value;
}

/**
 * Invokes the application's signer, bounded by the attempt, and rejects an unusable result.
 *
 * The signer runs inside the attempt window so a signing call that never settles
 * fails with the attempt rather than hanging the request. Losing that race
 * rejects with an `AbortError`, which the transport classifies from the attempt's
 * own reason, so a timed-out signer reports a timeout exactly as a timed-out
 * Fetch does.
 *
 * The signer's own failure is never attached as a cause, because a crypto
 * library's error text can echo key material.
 * @param sign Application-supplied signing function.
 * @param input Payload and components to sign.
 * @param endpoint Endpoint the signature is for.
 * @param attemptSignal Signal aborting this attempt on timeout or caller cancellation.
 * @returns Value to send as `X-Sign`.
 * @throws {MonobankValidationError} When the signer throws or yields an empty signature.
 */
async function createSignature(
  sign: CorporateSigner,
  input: CorporateSignatureInput,
  endpoint: string,
  attemptSignal: AbortSignal,
): Promise<string> {
  return await Promise.race([
    requireSignature(sign, input, endpoint),
    rejectWhenAborted(attemptSignal),
  ]);
}

/**
 * Builds a promise that rejects when the attempt aborts.
 *
 * The listener is registered `once` on a signal that belongs to this attempt
 * alone, so nothing accumulates across retries. This relies on the attempt signal
 * not being aborted yet: the transport checks the caller's signal and reaches
 * signing with no `await` in between, so no abort can interleave. Introducing an
 * `await` before signing would strand this promise, because a listener added to
 * an already-aborted signal never fires.
 * @param signal Signal aborting the current attempt.
 * @returns Promise that rejects with an `AbortError` when the attempt aborts.
 */
function rejectWhenAborted(signal: AbortSignal): Promise<never> {
  const rejected = new Promise<never>((_resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => {
        reject(new DOMException("Signing aborted", "AbortError"));
      },
      { once: true },
    );
  });

  rejected.catch(() => undefined);

  return rejected;
}

async function requireSignature(
  sign: CorporateSigner,
  input: CorporateSignatureInput,
  endpoint: string,
): Promise<string> {
  try {
    const signature = await sign(input);

    if (signature.length > 0) {
      return signature;
    }
  } catch {
    throw createSignerError(endpoint);
  }

  throw createSignerError(endpoint);
}

function createSignerError(endpoint: string): MonobankValidationError {
  return new MonobankValidationError({
    endpoint,
    issues: ["corporate signer failed to produce a signature"],
    message: "Invalid Monobank transport request.",
  });
}

/**
 * Requires the configured Corporate key for operations that send `X-Key-Id`.
 *
 * Only the registration endpoints run before a key exists; everything else
 * fails here, ahead of Fetch, when the client was built without one.
 * @param keyId Configured Corporate key identifier, if any.
 * @param endpoint Endpoint the request targets.
 * @returns The configured key identifier.
 * @throws {MonobankValidationError} When no key identifier was configured.
 */
function requireKeyId(keyId: string | undefined, endpoint: string): string {
  if (keyId === undefined) {
    throw new MonobankValidationError({
      endpoint,
      issues: [
        "corporate.keyId is required for endpoints other than registration",
      ],
      message: "Invalid Monobank transport request.",
    });
  }

  return keyId;
}

function requireAuthenticatedToken(
  token: string | undefined,
  endpoint: string,
): string {
  if (token === undefined) {
    throw new MonobankValidationError({
      endpoint,
      issues: ["token is required for authenticated requests"],
      message: "Invalid Monobank transport request.",
    });
  }

  return token;
}

function validateEndpointUrl(
  endpoint: string,
  baseUrl: URL,
  auth: boolean,
  authenticatedPathPrefix: "/api/" | "/api/merchant/" | "/personal/",
): URL {
  const issues: string[] = [];

  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    issues.push("endpoint must be a root-relative path");
  }

  const endpointUrl = new URL(endpoint, baseUrl);

  if (endpointUrl.origin !== baseUrl.origin) {
    issues.push("endpoint must resolve within the configured base URL origin");
  }

  if (auth && !endpointUrl.pathname.startsWith(authenticatedPathPrefix)) {
    issues.push(
      `authenticated endpoints must use an ${authenticatedPathPrefix} path`,
    );
  }

  if (issues.length > 0) {
    throw new MonobankValidationError({
      endpoint,
      issues,
      message: "Invalid Monobank transport request.",
    });
  }

  return endpointUrl;
}
