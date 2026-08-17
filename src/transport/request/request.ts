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

  // `validateEndpointUrl` can only vet the initial URL. Fetch keeps custom
  // headers such as `X-Token` across a cross-origin redirect, and 307/308
  // replays the method and body, so following one would send credentials and
  // repeat mutations somewhere this transport never validated.
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
