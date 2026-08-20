import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";
import * as z from "zod/mini";

import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import { firstRequestHeaders } from "../../../tests/support/fetch-request-inspection.js";
import { MonobankTransport } from "../transport.js";

const storeSecret = "secret_98765432--123-123";

function createTransport(fetch: ReturnType<typeof createFetchSequence>) {
  return new MonobankTransport({
    authenticatedPathPrefix: "/api/",
    baseUrl: "https://u2.monobank.com.ua",
    fetch,
    installments: { storeId: "test_store_with_confirm", storeSecret },
  });
}

describe("installments request headers", () => {
  it("signs an empty payload when a signed request carries no body", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 200 })]);

    await createTransport(fetch).getEmpty({
      auth: true,
      endpoint: "/api/order/state",
    });

    expect(firstRequestHeaders(fetch).get("signature")).toBe(
      createHmac("sha256", storeSecret).update("").digest("base64"),
    );
    expect(fetch.mock.calls[0]?.[1]?.body).toBeUndefined();
  });

  it("keeps an Accept header the operation already set", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);

    await createTransport(fetch).postJson({
      auth: true,
      body: { order_id: "order-42" },
      endpoint: "/api/order/state",
      headers: { Accept: "application/pdf" },
      schema: z.looseObject({ ok: z.boolean() }),
    });

    expect(firstRequestHeaders(fetch).get("Accept")).toBe("application/pdf");
    expect(firstRequestHeaders(fetch).get("signature")).toBe(
      createHmac("sha256", storeSecret)
        .update(JSON.stringify({ order_id: "order-42" }))
        .digest("base64"),
    );
  });

  it("defaults Accept to JSON when the operation sets none", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);

    await createTransport(fetch).postJson({
      auth: true,
      body: { order_id: "order-42" },
      endpoint: "/api/order/state",
      schema: z.looseObject({ ok: z.boolean() }),
    });

    expect(firstRequestHeaders(fetch).get("Accept")).toBe("application/json");
  });

  it("signs the exact serialized body bytes, not a fixed or empty digest", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const body = { note: "édition spéciale", order_id: "order-42" };

    await createTransport(fetch).postJson({
      auth: true,
      body,
      endpoint: "/api/order/state",
      schema: z.looseObject({ ok: z.boolean() }),
    });

    expect(firstRequestHeaders(fetch).get("signature")).toBe(
      createHmac("sha256", storeSecret)
        .update(JSON.stringify(body))
        .digest("base64"),
    );
  });

  it("produces a different signature for a different store secret", async () => {
    const fetchA = createFetchSequence([jsonResponse({ ok: true })]);
    const fetchB = createFetchSequence([jsonResponse({ ok: true })]);
    const body = { order_id: "order-42" };
    const transportB = new MonobankTransport({
      authenticatedPathPrefix: "/api/",
      baseUrl: "https://u2.monobank.com.ua",
      fetch: fetchB,
      installments: {
        storeId: "test_store_with_confirm",
        storeSecret: "a-different-secret",
      },
    });

    await createTransport(fetchA).postJson({
      auth: true,
      body,
      endpoint: "/api/order/state",
      schema: z.looseObject({ ok: z.boolean() }),
    });
    await transportB.postJson({
      auth: true,
      body,
      endpoint: "/api/order/state",
      schema: z.looseObject({ ok: z.boolean() }),
    });

    expect(firstRequestHeaders(fetchA).get("signature")).not.toBe(
      firstRequestHeaders(fetchB).get("signature"),
    );
  });
});
