import { afterEach, describe, expect, it, vi } from "vitest";

import { clientInfoFixture } from "../../../tests/fixtures/personal/client-info.js";
import { expectPersonalCancellation } from "../../../tests/support/caller-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import { firstRequestHeaders } from "../../../tests/support/fetch-request-inspection.js";
import { MonobankPersonalClient } from "../client/monobank-personal-client.js";

function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

describe("MonobankPersonalClientInfo", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("loads client information with the Personal token", async () => {
    const fetch = createFetchSequence([jsonResponse(clientInfoFixture)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.client.getInfo()).resolves.toEqual(clientInfoFixture);
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://api.monobank.ua/personal/client-info"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("personal-token");
  });

  it("aborts an in-flight client-info request on caller cancellation", async () => {
    await expectPersonalCancellation((client, signal) =>
      client.client.getInfo({ signal }),
    );
  });

  it("turns malformed nested payloads into safe validation errors", async () => {
    const fetch = createFetchSequence([
      jsonResponse({
        ...clientInfoFixture,
        accounts: [
          {
            ...clientInfoFixture.accounts[0],
            balance: "10000000",
          },
        ],
      }),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.client.getInfo()).rejects.toMatchObject({
      endpoint: "/personal/client-info",
      name: "MonobankResponseValidationError",
    });
  });

  it("redacts the token from upstream failures", async () => {
    const fetch = createFetchSequence([
      textResponse("personal-token denied", { status: 403 }),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.client.getInfo()).rejects.toMatchObject({
      endpoint: "/personal/client-info",
      status: 403,
      upstreamMessage: "[redacted] denied",
    });
  });

  it("uses configured safe retries", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(1);
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(clientInfoFixture),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "personal-token",
    });

    const result = client.client.getInfo();
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual(clientInfoFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      fetch.mock.calls.every(
        ([, init]) =>
          new Headers(init?.headers).get("X-Token") === "personal-token",
      ),
    ).toBe(true);
  });

  it("does not retry unless configured", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 503 })]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.client.getInfo()).rejects.toMatchObject({
      status: 503,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
