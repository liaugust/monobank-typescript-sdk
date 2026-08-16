import { describe, expect, it } from "vitest";

import { createFetchSequence } from "../../../tests/support/create-fetch-sequence.js";
import { firstRequestHeaders } from "../../../tests/support/fetch-request-inspection.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankPersonalClient } from "../client/monobank-personal-client.js";

function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

describe("MonobankPersonalClient webhook configuration", () => {
  it("sets an HTTPS webhook URL with an authenticated JSON body", async () => {
    const fetch = createFetchSequence([new Response(null)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(
      client.webhooks.set({ webHookUrl: "https://example.test/mono-hook" }),
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

    await client.webhooks.set({ webHookUrl: "" });

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
      client.webhooks.set({ webHookUrl: "/mono" }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.webhooks.set({ webHookUrl: "ftp://example.test/mono" }),
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

    await client.webhooks.set(
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
      client.webhooks.set({ webHookUrl: "https://example.test/mono-hook" }),
    ).rejects.toMatchObject({
      endpoint: "/personal/webhook",
      status: 403,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
