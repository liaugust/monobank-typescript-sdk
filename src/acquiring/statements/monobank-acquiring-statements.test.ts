import { afterEach, describe, expect, it, vi } from "vitest";

import { acquiringStatementFixture } from "../../../tests/fixtures/acquiring/statements.js";
import { createAbortableFetch } from "../../../tests/support/create-abortable-fetch.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankAcquiringClient } from "../client/monobank-acquiring-client.js";

describe("MonobankAcquiringStatements", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects malformed successful responses", async () => {
    const fetch = createFetchSequence([
      jsonResponse({
        list: [
          {
            ...acquiringStatementFixture.list[0],
            status: "unknown",
          },
        ],
      }),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(
      client.statements.get({ from: 1_786_838_400 }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("passes caller cancellation to the active request", async () => {
    const { entered, fetch, requestSignal } = createAbortableFetch();
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });
    const controller = new AbortController();

    const request = client.statements.get(
      { from: 1_786_838_400 },
      { signal: controller.signal },
    );
    request.catch(() => undefined);
    await entered;
    controller.abort();

    expect(requestSignal()?.aborted).toBe(true);
    await expect(request).rejects.toMatchObject({ reason: "aborted" });
  });

  it("uses the configured safe retry policy", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(acquiringStatementFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "acquiring-token",
    });

    const result = client.statements.get({ from: 1_786_838_400 });
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(acquiringStatementFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid input before Fetch", async () => {
    const fetch = createFetchSequence([]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.statements.get({ from: -1 })).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
