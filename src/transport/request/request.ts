import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import type { ResponseSchema } from "../response-schema.js";
import type { StoredTransportOptions } from "../transport-options.js";

export interface JsonRequest<T> extends EmptyRequest {
  readonly schema: ResponseSchema<T>;
}

export interface EmptyRequest {
  readonly auth: boolean;
  readonly body?: unknown;
  readonly endpoint: string;
  readonly headers?: HeadersInit;
  readonly retryable?: boolean;
  readonly signal?: AbortSignal;
}

/**
 * Builds the validated URL and Fetch init for one Monobank request.
 *
 * Redirects are refused because only the initial URL can be validated here.
 * Fetch keeps custom headers such as `X-Token` across a cross-origin redirect
 * and replays the method and body on 307/308, so following one would send the
 * token, and repeat a mutation, at an origin this transport never checked.
 * @param method HTTP method for the request.
 * @param request Endpoint, authentication, body, and cancellation inputs.
 * @param options Validated transport configuration.
 * @returns Absolute request URL and its Fetch init.
 * @throws {MonobankValidationError} When the endpoint escapes the base URL, targets the wrong authenticated prefix, or needs a token that is not configured.
 */
export function createRequest(
  method: "DELETE" | "GET" | "POST",
  request: EmptyRequest,
  options: StoredTransportOptions,
): { readonly init: RequestInit; readonly url: URL } {
  const url = validateEndpointUrl(
    request.endpoint,
    options.baseUrl,
    request.auth,
    options.authenticatedPathPrefix,
  );
  const headers = new Headers(request.headers);
  headers.set("Accept", "application/json");

  if (request.auth) {
    headers.set(
      "X-Token",
      requireAuthenticatedToken(options.token, request.endpoint),
    );
  }

  const init: RequestInit = { headers, method, redirect: "error" };

  if (request.signal !== undefined) {
    init.signal = request.signal;
  }

  if (request.body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(request.body);
  }

  return { init, url };
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
  authenticatedPathPrefix: "/api/merchant/" | "/personal/",
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
