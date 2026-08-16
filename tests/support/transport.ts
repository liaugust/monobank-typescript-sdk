import { expect, vi } from "vitest";
import * as z from "zod/mini";

import { MonobankTransport } from "../../src/transport/transport.js";
import type { createFetchSequence } from "./create-fetch-sequence.js";

export const passthroughSchema = z.looseObject({ ok: z.boolean() });
export const shortRetry = {
  baseDelayMs: 100,
  maxAttempts: 2,
  maxDelayMs: 100,
};
export type TestFetch = NonNullable<
  ConstructorParameters<typeof MonobankTransport>[0]["fetch"]
>;

export function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

export async function getBankSync(
  transport: MonobankTransport,
  options: { readonly auth?: boolean; readonly retryable?: boolean } = {},
) {
  return transport.getJson({
    auth: options.auth ?? false,
    endpoint: "/bank/sync",
    schema: passthroughSchema,
    ...(options.retryable === undefined
      ? {}
      : { retryable: options.retryable }),
  });
}

export async function getPersonalClientInfo(transport: MonobankTransport) {
  return transport.getJson({
    auth: true,
    endpoint: "/personal/client-info",
    schema: passthroughSchema,
  });
}

export async function requestSafeGet(transport: MonobankTransport) {
  return transport.getJson({
    auth: true,
    endpoint: "/personal/client-info",
    retryable: true,
    schema: passthroughSchema,
  });
}

export async function requestSafePost(transport: MonobankTransport) {
  return transport.postJson({
    auth: true,
    endpoint: "/personal/webhook",
    retryable: true,
    schema: passthroughSchema,
  });
}

export function requestSafeGetWithSignal(
  transport: MonobankTransport,
  signal: AbortSignal,
) {
  return transport.getJson({
    auth: true,
    endpoint: "/personal/client-info",
    retryable: true,
    schema: passthroughSchema,
    signal,
  });
}

export function createRetryingTransport(fetch: TestFetch): MonobankTransport {
  return new MonobankTransport({
    fetch,
    retry: shortRetry,
    token: "secret-token",
  });
}

export function createAbortRejectingFetch(): TestFetch {
  return vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Request aborted", "AbortError"));
      });
    });
  });
}

export function createSignalBoundTextFetch(
  status: number,
  abortFailure: () => Error | DOMException,
): {
  readonly fetch: TestFetch;
  readonly textStarted: Promise<void>;
} {
  let markTextStarted: () => void = () => undefined;
  const textStarted = new Promise<void>((resolve) => {
    markTextStarted = resolve;
  });
  const fetch = vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
    const response = {
      headers: new Headers(),
      ok: status >= 200 && status < 300,
      status,
      text: () => {
        markTextStarted();

        return new Promise<string>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(abortFailure());
          });
        });
      },
    } as Response;

    return Promise.resolve(response);
  });

  return { fetch, textStarted };
}

export function abortDomException(): DOMException {
  return new DOMException("Body aborted", "AbortError");
}

export function abortGenericError(): Error {
  return new Error("Body read stopped");
}

export async function settleState(request: Promise<unknown>): Promise<unknown> {
  let state: unknown = "pending";
  request.then(
    (value) => {
      state = value;
    },
    (error: unknown) => {
      state = error;
    },
  );
  await flushMicrotasks();

  return state;
}

export async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export function firstRequestInit(
  fetch: ReturnType<typeof createFetchSequence>,
): RequestInit | undefined {
  const [, init] = fetch.mock.calls[0] ?? [];

  return init;
}

export function firstRequestUrl(
  fetch: ReturnType<typeof createFetchSequence>,
): URL {
  const [input] = fetch.mock.calls[0] ?? [];
  expect(input).toBeInstanceOf(URL);
  if (!(input instanceof URL)) {
    throw new Error("Transport should call Fetch with a URL instance");
  }

  return input;
}

export async function expectRejectsWithoutSecret(request: Promise<unknown>) {
  await expect(request).rejects.not.toSatisfy((error: unknown) =>
    containsStringRecursively(error, "secret-token"),
  );
}

export async function captureRejection(
  request: Promise<unknown>,
): Promise<unknown> {
  try {
    await request;
  } catch (error) {
    return error;
  }

  throw new Error("Expected request to reject");
}

export function containsStringRecursively(
  value: unknown,
  needle: string,
  seen = new Set<object>(),
): boolean {
  if (typeof value === "string") {
    return value.includes(needle);
  }

  if (value instanceof Error) {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);

    const values: unknown[] = [value.message, value.cause];
    for (const key of Object.keys(value)) {
      values.push((value as unknown as Readonly<Record<string, unknown>>)[key]);
    }

    return values.some((item) => containsStringRecursively(item, needle, seen));
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }
  seen.add(value);

  return Object.values(value).some((item) =>
    containsStringRecursively(item, needle, seen),
  );
}
