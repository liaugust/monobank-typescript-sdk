import { describe, expect, it, vi } from "vitest";

import { createFetchSequence } from "../../../tests/support/create-fetch-sequence.js";
import { firstRequestUrl } from "../../../tests/support/fetch-request-inspection.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankTransport } from "../../transport/transport.js";
import { MonobankInstallmentsClient } from "./monobank-installments-client.js";

const storeCredential = {
  storeId: "test_store_with_confirm",
  storeSecret: "secret_98765432--123-123",
} as const;

describe("MonobankInstallmentsClient", () => {
  it("defaults to the documented production origin", async () => {
    const fetch = createFetchSequence([
      new Response(JSON.stringify({ found: true }), {
        headers: { "Content-Type": "application/json" },
      }),
    ]);
    const client = new MonobankInstallmentsClient({
      ...storeCredential,
      fetch,
    });

    await client.clients.validateV2({ phone: "+380501234567" });

    expect(firstRequestUrl(fetch).origin).toBe("https://u2.monobank.com.ua");
  });

  it("accepts the documented sandbox origin", async () => {
    const fetch = createFetchSequence([
      new Response(JSON.stringify({ found: true }), {
        headers: { "Content-Type": "application/json" },
      }),
    ]);
    const client = new MonobankInstallmentsClient({
      ...storeCredential,
      baseUrl: "https://u2-demo-ext.mono.st4g3.com",
      fetch,
    });

    await client.clients.validateV2({ phone: "+380501234567" });

    expect(firstRequestUrl(fetch).origin).toBe(
      "https://u2-demo-ext.mono.st4g3.com",
    );
  });

  it("rejects a store identifier that cannot be sent as a header", () => {
    for (const storeId of ["", "store id", "store\nid"]) {
      expect(
        () =>
          new MonobankInstallmentsClient({
            fetch: vi.fn(),
            storeId,
            storeSecret: storeCredential.storeSecret,
          }),
      ).toThrow(MonobankValidationError);
    }
  });

  it("rejects an empty store secret", () => {
    expect(
      () =>
        new MonobankInstallmentsClient({
          fetch: vi.fn(),
          storeId: storeCredential.storeId,
          storeSecret: "",
        }),
    ).toThrow(MonobankValidationError);
  });

  it("rejects a cleartext origin that would expose the signature", () => {
    expect(
      () =>
        new MonobankInstallmentsClient({
          ...storeCredential,
          baseUrl: "http://u2.monobank.com.ua",
          fetch: vi.fn(),
        }),
    ).toThrow(MonobankValidationError);
  });

  it("allows a loopback origin for a local proxy", () => {
    expect(
      () =>
        new MonobankInstallmentsClient({
          ...storeCredential,
          baseUrl: "http://127.0.0.1:8080",
          fetch: vi.fn(),
        }),
    ).not.toThrow();
  });

  it("refuses to combine a store credential with another family's", () => {
    expect(
      () =>
        new MonobankTransport({
          fetch: vi.fn(),
          installments: storeCredential,
          token: "acquiring-token",
        }),
    ).toThrow(MonobankValidationError);
    expect(
      () =>
        new MonobankTransport({
          corporate: { keyId: "corporate-key-id", sign: () => "c2ln" },
          fetch: vi.fn(),
          installments: storeCredential,
        }),
    ).toThrow(MonobankValidationError);
  });

  it("keeps a mutated credential object from changing later requests", async () => {
    const mutable: { storeId: string; storeSecret: string } = {
      ...storeCredential,
    };
    const fetch = createFetchSequence([
      new Response(JSON.stringify({ found: true }), {
        headers: { "Content-Type": "application/json" },
      }),
    ]);
    const client = new MonobankInstallmentsClient({ ...mutable, fetch });

    mutable.storeId = "another_store";
    await client.clients.validateV2({ phone: "+380501234567" });

    expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get("store-id")).toBe(
      "test_store_with_confirm",
    );
  });

  it("passes optional transport controls through", async () => {
    const fetch = createFetchSequence([
      new Response(JSON.stringify({ found: true }), {
        headers: { "Content-Type": "application/json" },
      }),
    ]);
    const client = new MonobankInstallmentsClient({
      ...storeCredential,
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 100 },
      timeoutMs: 5_000,
    });

    await expect(
      client.clients.validateV2({ phone: "+380501234567" }),
    ).resolves.toEqual({ found: true });
  });

  it("falls back to the global fetch when none is supplied", () => {
    expect(() => new MonobankInstallmentsClient(storeCredential)).not.toThrow();
  });
});
