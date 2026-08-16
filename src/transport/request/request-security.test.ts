import { describe, expect, it } from "vitest";

import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  expectRejectsWithoutSecret,
  firstRequestInit,
  getBankSync,
  getPersonalClientInfo,
  passthroughSchema,
} from "../../../tests/support/transport.js";
import { MonobankNetworkError } from "../../errors/monobank-network-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankTransport } from "../transport.js";

describe("MonobankTransport request security", () => {
  it("never sends the token to public endpoints", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await getBankSync(transport);

    const init = firstRequestInit(fetch);
    expect(new Headers(init?.headers).has("X-Token")).toBe(false);
  });

  it("sends the token only for authenticated requests", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await transport.getJson({
      auth: true,
      endpoint: "/personal/client-info",
      schema: passthroughSchema,
    });

    const [, init] = fetch.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("X-Token")).toBe("secret-token");
  });

  it("rejects authenticated requests when no token was configured", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch });

    await expect(getPersonalClientInfo(transport)).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses to follow redirects that could carry the token off origin", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ ok: true }),
      jsonResponse({ ok: true }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await getPersonalClientInfo(transport);
    expect(firstRequestInit(fetch)?.redirect).toBe("error");

    await transport.postEmpty({
      auth: true,
      body: { webHookUrl: "" },
      endpoint: "/personal/webhook",
    });
    expect(fetch.mock.calls[1]?.[1]?.redirect).toBe("error");
  });

  it("surfaces a blocked redirect as a credential-safe network error", async () => {
    // undici rejects a blocked redirect as TypeError("fetch failed") whose
    // cause carries the detail; the transport discards both.
    const fetch = createFetchSequence([
      new TypeError("fetch failed", {
        cause: new Error("unexpected redirect"),
      }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    const request = getPersonalClientInfo(transport);
    request.catch(() => undefined);

    await expect(request).rejects.toBeInstanceOf(MonobankNetworkError);
    await expect(request).rejects.toMatchObject({ reason: "network" });
    await expectRejectsWithoutSecret(request);
  });

  it("sets JSON accept headers without content type for bodyless requests", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });
    const controller = new AbortController();

    await transport.getJson({
      auth: false,
      endpoint: "/bank/sync",
      schema: passthroughSchema,
      signal: controller.signal,
    });

    const init = firstRequestInit(fetch);
    const headers = new Headers(init?.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.has("Content-Type")).toBe(false);
    expect(init?.method).toBe("GET");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("sets content type and serializes JSON bodies for postJson", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await transport.postJson({
      auth: true,
      body: { webHookUrl: "https://example.test/hook" },
      endpoint: "/personal/webhook",
      schema: passthroughSchema,
    });

    const [, init] = fetch.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init?.body).toBe('{"webHookUrl":"https://example.test/hook"}');
    expect(init?.method).toBe("POST");
  });

  it.each([
    ["absolute", "https://evil.test/personal/client-info"],
    ["protocol-relative", "//evil.test/personal/client-info"],
    ["relative", "personal/client-info"],
    ["authenticated public", "/bank/sync"],
  ])("rejects %s authenticated endpoint before Fetch", async (_, endpoint) => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(
      transport.getJson({
        auth: true,
        endpoint,
        schema: passthroughSchema,
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
