import { afterEach, describe, expect, it, vi } from "vitest";

import { statementItemFixture } from "../../../tests/fixtures/personal-api.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import type { GetStatementsInput } from "../get-statements-input.js";
import { MonobankPersonalClient } from "./monobank-personal-client.js";

function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

describe("MonobankPersonalClient statements", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds an encoded statement path from Date inputs", async () => {
    const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await client.getStatements({
      account: "jar/id",
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-02T00:00:00.000Z"),
    });

    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/personal/statement/jar%2Fid/1785542400/1785628800",
    );
  });

  it("defaults statement account to 0 and omits the to segment", async () => {
    const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await client.getStatements({
      from: 1_785_542_400,
    });

    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/personal/statement/0/1785542400",
    );
  });

  it("defaults statement account to 0 for a complete time window", async () => {
    const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await client.getStatements({
      from: 1_785_542_400,
      to: 1_785_628_800,
    });

    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/personal/statement/0/1785542400/1785628800",
    );
  });

  it("gets statements with X-Token and validates statement items", async () => {
    const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(
      client.getStatements({ account: "0", from: 1_785_542_400 }),
    ).resolves.toEqual([statementItemFixture]);
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://api.monobank.ua/personal/statement/0/1785542400"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("personal-token");
  });

  it("rejects invalid statement input before Fetch", async () => {
    const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(
      client.getStatements({ account: "0", from: 1_000, to: 2_683_001 }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects dot-segment statement accounts before Fetch", async () => {
    const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(
      client.getStatements({ account: ".", from: 1_000 }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.getStatements({ account: "..", from: 1_000 }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a null statement account before Fetch", async () => {
    const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(
      client.getStatements({
        account: null,
        from: 1_785_542_400,
      } as unknown as GetStatementsInput),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("turns malformed statement payloads into safe response validation errors", async () => {
    const fetch = createFetchSequence([
      jsonResponse([{ ...statementItemFixture, amount: "-12345" }]),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(
      client.getStatements({ account: "0", from: 1_785_542_400 }),
    ).rejects.toMatchObject({
      endpoint: "/personal/statement/0/1785542400",
      name: "MonobankResponseValidationError",
    });
  });

  it("passes caller signals to statement requests", async () => {
    const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });
    const controller = new AbortController();

    await client.getStatements(
      { account: "0", from: 1_785_542_400 },
      { signal: controller.signal },
    );

    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses configured safe retries for statement GET requests", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse([statementItemFixture]),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "personal-token",
    });

    const result = client.getStatements({
      account: "0",
      from: 1_785_542_400,
    });
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual([statementItemFixture]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("MonobankPersonalClient webhook configuration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets an HTTPS webhook URL with an authenticated JSON body", async () => {
    const fetch = createFetchSequence([new Response(null)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(
      client.setWebhook({ webHookUrl: "https://example.test/mono-hook" }),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://api.monobank.ua/personal/webhook"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("personal-token");
    expect(firstRequestHeaders(fetch).get("Content-Type")).toBe(
      "application/json",
    );
    expect(fetch.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ webHookUrl: "https://example.test/mono-hook" }),
    );
  });

  it("removes webhook configuration with an empty URL", async () => {
    const fetch = createFetchSequence([new Response(null)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await client.setWebhook({ webHookUrl: "" });

    expect(fetch.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ webHookUrl: "" }),
    );
  });

  it("rejects relative and non-HTTP webhook URLs before Fetch", async () => {
    const fetch = createFetchSequence([new Response(null)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(
      client.setWebhook({ webHookUrl: "/mono" }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.setWebhook({ webHookUrl: "ftp://example.test/mono" }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes caller signals to webhook requests", async () => {
    const fetch = createFetchSequence([new Response(null)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });
    const controller = new AbortController();

    await client.setWebhook(
      { webHookUrl: "https://example.test/mono-hook" },
      { signal: controller.signal },
    );

    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("surfaces upstream webhook failures without retrying", async () => {
    const fetch = createFetchSequence([
      textResponse("denied", { status: 403 }),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "personal-token",
    });

    await expect(
      client.setWebhook({ webHookUrl: "https://example.test/mono-hook" }),
    ).rejects.toMatchObject({
      endpoint: "/personal/webhook",
      status: 403,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
