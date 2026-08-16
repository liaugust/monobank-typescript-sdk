import * as z from "zod/mini";

import { MonobankApiError } from "../errors/monobank-api-error.js";
import { MonobankNetworkError } from "../errors/monobank-network-error.js";
import { MonobankResponseValidationError } from "../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import type { FetchLike } from "./fetch-like.js";
import { parseRetryAfter } from "./parse-retry-after.js";
import type { ResponseSchema } from "./response-schema.js";
import type { RetryOptions } from "./retry-options.js";

interface TransportOptions {
  readonly baseUrl?: string;
  readonly fetch?: FetchLike;
  readonly retry?: RetryOptions;
  readonly timeoutMs?: number;
  readonly token: string;
}

interface JsonRequest<T> {
  readonly auth: boolean;
  readonly body?: unknown;
  readonly endpoint: string;
  readonly retryable?: boolean;
  readonly schema: ResponseSchema<T>;
  readonly signal?: AbortSignal;
}

interface EmptyRequest {
  readonly auth: boolean;
  readonly body?: unknown;
  readonly endpoint: string;
  readonly retryable?: boolean;
  readonly signal?: AbortSignal;
}

interface StoredTransportOptions {
  readonly baseUrl: URL;
  readonly fetch: FetchLike;
  readonly retry?: RetryOptions;
  readonly timeoutMs: number;
  readonly token: string;
}

const defaultBaseUrl = "https://api.monobank.ua";
const defaultTimeoutMs = 10_000;
const emptyResponseSchema = z.undefined();
const retryableStatusCodes = new Set([429, 500, 502, 503, 504]);

export class MonobankTransport {
  private readonly options: StoredTransportOptions;

  public constructor(options: TransportOptions) {
    const retry = options.retry;

    this.options = {
      baseUrl: validateBaseUrl(options.baseUrl ?? defaultBaseUrl),
      fetch: options.fetch ?? validateGlobalFetch(),
      timeoutMs: validateTimeout(options.timeoutMs ?? defaultTimeoutMs),
      token: validateToken(options.token),
      ...(retry === undefined ? {} : { retry: validateRetry(retry) }),
    };
  }

  public async getJson<T>(request: JsonRequest<T>): Promise<T> {
    return this.executeJson("GET", request);
  }

  public async postJson<T>(request: JsonRequest<T>): Promise<T> {
    return this.executeJson("POST", request);
  }

  public async postEmpty(request: EmptyRequest): Promise<void> {
    await this.execute("POST", request);
    emptyResponseSchema.safeParse(undefined);
  }

  private async executeJson<T>(
    method: "GET" | "POST",
    request: JsonRequest<T>,
  ): Promise<T> {
    const response = await this.execute(method, request);
    const payload = await parseSuccessJson(response, request.endpoint);
    const parsed = request.schema.safeParse(payload);

    if (!parsed.success) {
      throw new MonobankResponseValidationError({
        endpoint: request.endpoint,
        issues: parsed.error.issues,
        message: "Monobank response did not match the expected schema.",
      });
    }

    return parsed.data;
  }

  private async execute(
    method: "GET" | "POST",
    request: EmptyRequest,
  ): Promise<Response> {
    const endpointUrl = validateEndpointUrl(
      request.endpoint,
      this.options.baseUrl,
      request.auth,
    );
    const headers = new Headers({ Accept: "application/json" });

    if (request.auth) {
      headers.set("X-Token", this.options.token);
    }

    const init: RequestInit = {
      headers,
      method,
    };

    if (request.signal !== undefined) {
      init.signal = request.signal;
    }

    if (request.body !== undefined) {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(request.body);
    }

    let attempt = 1;
    for (;;) {
      let response: Response;
      try {
        response = await this.fetchAttempt(endpointUrl, init, request);
      } catch (error) {
        const networkError = error as MonobankNetworkError;
        const delayMs = retryDelayForNetworkError(
          networkError,
          method,
          request,
          this.options.retry,
          attempt,
        );
        if (delayMs === undefined) {
          throw networkError;
        }

        await delayBeforeRetry(delayMs, request.endpoint, request.signal);
        attempt += 1;
        continue;
      }

      if (response.ok) {
        return response;
      }

      const error = await createApiError(
        response,
        request.endpoint,
        this.options.token,
      );
      const delayMs = retryDelayForApiError(
        error,
        method,
        request,
        this.options.retry,
        attempt,
      );
      if (delayMs === undefined) {
        throw error;
      }

      await delayBeforeRetry(delayMs, request.endpoint, request.signal);
      attempt += 1;
    }
  }

  private async fetchAttempt(
    endpointUrl: URL,
    init: RequestInit,
    request: EmptyRequest,
  ): Promise<Response> {
    if (request.signal?.aborted) {
      throw createAbortedError(request.endpoint);
    }

    const attemptSignal = createAttemptSignal(
      this.options.timeoutMs,
      request.signal,
    );

    try {
      return await this.options.fetch(endpointUrl, {
        ...init,
        signal: attemptSignal.signal,
      });
    } catch {
      throw new MonobankNetworkError({
        endpoint: request.endpoint,
        message: "Monobank request failed before receiving a response.",
        reason: attemptSignal.reason(),
      });
    } finally {
      attemptSignal.cleanup();
    }
  }
}

interface AttemptSignal {
  readonly cleanup: () => void;
  readonly reason: () => "aborted" | "network" | "timeout";
  readonly signal: AbortSignal;
}

function createAttemptSignal(
  timeoutMs: number,
  callerSignal: AbortSignal | undefined,
): AttemptSignal {
  const controller = new AbortController();
  let reason: "aborted" | "network" | "timeout" = "network";
  const timeoutId = setTimeout(() => {
    reason = "timeout";
    controller.abort();
  }, timeoutMs);
  const abort = () => {
    reason = "aborted";
    controller.abort();
  };

  callerSignal?.addEventListener("abort", abort, { once: true });

  return {
    cleanup() {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener("abort", abort);
    },
    reason() {
      return reason;
    },
    signal: controller.signal,
  };
}

function retryDelayForApiError(
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

function retryDelayForNetworkError(
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

function delayBeforeRetry(
  delayMs: number,
  endpoint: string,
  callerSignal: AbortSignal | undefined,
): Promise<void> {
  if (callerSignal?.aborted) {
    return Promise.reject(createAbortedError(endpoint));
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      callerSignal?.removeEventListener("abort", abort);
    };
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);
    const abort = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(createAbortedError(endpoint));
    };

    callerSignal?.addEventListener("abort", abort, { once: true });
  });
}

function createAbortedError(endpoint: string): MonobankNetworkError {
  return new MonobankNetworkError({
    endpoint,
    message: "Monobank request was aborted before receiving a response.",
    reason: "aborted",
  });
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

function validateEndpointUrl(
  endpoint: string,
  baseUrl: URL,
  auth: boolean,
): URL {
  const issues: string[] = [];

  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    issues.push("endpoint must be a root-relative path");
  }

  const endpointUrl = new URL(endpoint, baseUrl);

  if (endpointUrl.origin !== baseUrl.origin) {
    issues.push("endpoint must resolve within the configured base URL origin");
  }

  if (auth && !endpointUrl.pathname.startsWith("/personal/")) {
    issues.push("authenticated endpoints must use a /personal/ path");
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

async function parseSuccessJson(
  response: Response,
  endpoint: string,
): Promise<unknown> {
  const text = await response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MonobankResponseValidationError({
      endpoint,
      issues: [
        {
          code: "invalid_json",
          message: "Response body is not valid JSON.",
          path: [],
        },
      ],
      message: "Monobank response body was not valid JSON.",
    });
  }
}

async function createApiError(
  response: Response,
  endpoint: string,
  token: string,
): Promise<MonobankApiError> {
  const upstreamMessage = sanitizeUpstreamMessage(
    await readResponseText(response),
    token,
  );

  const retryAfterMs = parseRetryAfter(
    response.headers.get("Retry-After"),
    Date.now(),
  );

  return new MonobankApiError({
    endpoint,
    headers: Object.fromEntries(response.headers.entries()),
    message: `Monobank API request failed with status ${String(response.status)}.`,
    status: response.status,
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    ...(upstreamMessage === undefined ? {} : { upstreamMessage }),
  });
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function sanitizeUpstreamMessage(
  responseText: string,
  token: string,
): string | undefined {
  if (responseText.length === 0) {
    return undefined;
  }

  const jsonMessage = parseErrorDescription(responseText);
  const message = jsonMessage ?? responseText;
  const redacted = message.split(token).join("[redacted]");

  return redacted.slice(0, 1_024);
}

function parseErrorDescription(responseText: string): string | undefined {
  try {
    const parsed = JSON.parse(responseText) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "errorDescription" in parsed &&
      typeof parsed.errorDescription === "string"
    ) {
      return parsed.errorDescription;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
