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
    const endpointUrl = new URL(request.endpoint, this.options.baseUrl);
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

    let response: Response;
    try {
      response = await this.options.fetch(endpointUrl, init);
    } catch (cause) {
      throw new MonobankNetworkError({
        endpoint: request.endpoint,
        message: "Monobank request failed before receiving a response.",
        reason: "network",
        ...(cause instanceof Error ? { cause } : {}),
      });
    }

    if (!response.ok) {
      throw await createApiError(
        response,
        request.endpoint,
        this.options.token,
      );
    }

    return response;
  }
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
