import { afterEach, describe, expect, it, vi } from "vitest";

import { acquiringEmployeeListFixture } from "../../../tests/fixtures/acquiring/employees.js";
import { createAbortableFetch } from "../../../tests/support/create-abortable-fetch.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankAcquiringClient } from "../client/monobank-acquiring-client.js";

describe("MonobankAcquiringEmployees", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the authenticated employee list", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringEmployeeListFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.employees.list()).resolves.toEqual(
      acquiringEmployeeListFixture,
    );
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/employee/list",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("rejects malformed successful responses", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ list: [{ id: "3QFX7e7mZfo3R", name: 42 }] }),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.employees.list()).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
  });

  it("uses the configured safe retry policy", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(acquiringEmployeeListFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "acquiring-token",
    });

    const result = client.employees.list();
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(acquiringEmployeeListFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("passes caller cancellation to the active request", async () => {
    const { fetch, requestSignal } = createAbortableFetch();
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });
    const controller = new AbortController();

    const request = client.employees.list({ signal: controller.signal });
    request.catch(() => undefined);
    await Promise.resolve();
    controller.abort();

    expect(requestSignal()?.aborted).toBe(true);
    await expect(request).rejects.toMatchObject({ reason: "aborted" });
  });
});
