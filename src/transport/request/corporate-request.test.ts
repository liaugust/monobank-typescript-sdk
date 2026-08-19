import { describe, expect, it, vi } from "vitest";

import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  createCorporateTransport,
  getCorporateSettings,
  shortRetry,
} from "../../../tests/support/transport.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankTransport } from "../transport.js";

function signature(fetch: ReturnType<typeof createFetchSequence>) {
  return new Headers(fetch.mock.calls[0]?.[1]?.headers);
}

describe("Corporate transport credentials", () => {
  it("signs each attempt again so a retry never replays a stale timestamp", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ ok: true }, { status: 500 }),
      jsonResponse({ ok: true }),
    ]);
    const sign = vi.fn(() => "c2ln");
    const transport = createCorporateTransport(fetch, sign, shortRetry);

    await getCorporateSettings(transport, { retryable: true });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sign).toHaveBeenCalledTimes(2);
  });

  it("rejects a corporate request that declares no signed payload variant", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = createCorporateTransport(fetch, () => "c2ln");

    await expect(
      getCorporateSettings(transport, { signed: false }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports a throwing signer without retaining its failure", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = createCorporateTransport(fetch, () => {
      throw new Error("private key 0xdeadbeef unreadable");
    });

    const rejection = await getCorporateSettings(transport).catch(
      (error: unknown) => error,
    );

    expect(rejection).toBeInstanceOf(MonobankValidationError);
    expect(JSON.stringify(rejection)).not.toContain("0xdeadbeef");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an empty signature rather than sending a blank header", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = createCorporateTransport(fetch, () => "");

    await expect(getCorporateSettings(transport)).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an empty request id rather than sending a blank header", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = createCorporateTransport(fetch, () => "c2ln");

    await expect(
      getCorporateSettings(transport, { requestId: "" }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a request id that would inject a second header", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = createCorporateTransport(fetch, () => "c2ln");

    await expect(
      getCorporateSettings(transport, {
        requestId: "req-1\r\nX-Token: injected",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a signature that would inject a second header", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = createCorporateTransport(
      fetch,
      () => "c2ln\r\nX-Token: injected",
    );

    await expect(getCorporateSettings(transport)).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts an asynchronous signer", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = createCorporateTransport(fetch, () =>
      Promise.resolve("YXN5bmM="),
    );

    await getCorporateSettings(transport, { requestId: "req-1" });

    expect(signature(fetch).get("X-Sign")).toBe("YXN5bmM=");
  });

  it("redacts an echoed key identifier and drops echoed credential headers", async () => {
    const fetch = createFetchSequence([
      jsonResponse(
        { errorDescription: "bad key corporate-key-id supplied" },
        {
          headers: {
            "X-Key-Id": "corporate-key-id",
            "X-Request-Id": "req-1",
            "X-Sign": "c2ln",
          },
          status: 400,
        },
      ),
    ]);
    const transport = createCorporateTransport(fetch, () => "c2ln");

    const rejection = await getCorporateSettings(transport).catch(
      (error: unknown) => error,
    );

    expect(JSON.stringify(rejection)).not.toContain("corporate-key-id");
    expect(rejection).toMatchObject({
      headers: { "x-request-id": "req-1" },
      upstreamMessage: "bad key [redacted] supplied",
    });
    expect(Object.keys((rejection as { headers: object }).headers)).not.toEqual(
      expect.arrayContaining(["x-sign", "x-key-id"]),
    );
  });

  it("refuses a transport configured with both a token and a corporate key", () => {
    expect(
      () =>
        new MonobankTransport({
          corporate: { keyId: "corporate-key-id", sign: () => "c2ln" },
          token: "secret-token",
        }),
    ).toThrow(MonobankValidationError);
  });

  it.each([
    ["an empty key identifier", ""],
    ["a padded key identifier", " corporate-key-id "],
    ["a key identifier that would inject a header", "key\r\nX-Token: injected"],
  ])("refuses %s", (_label, keyId) => {
    expect(
      () => new MonobankTransport({ corporate: { keyId, sign: () => "c2ln" } }),
    ).toThrow(MonobankValidationError);
  });

  it("refuses a signer that is not callable", () => {
    expect(
      () =>
        new MonobankTransport({
          corporate: {
            keyId: "corporate-key-id",
            sign: "not-a-function" as unknown as () => string,
          },
        }),
    ).toThrow(MonobankValidationError);
  });

  it("refuses to sign requests against a cleartext non-loopback origin", () => {
    expect(
      () =>
        new MonobankTransport({
          baseUrl: "http://api.example.com",
          corporate: { keyId: "corporate-key-id", sign: () => "c2ln" },
        }),
    ).toThrow(MonobankValidationError);
  });
});
