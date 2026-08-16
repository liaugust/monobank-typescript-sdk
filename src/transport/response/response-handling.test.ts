import { describe, expect, it } from "vitest";

import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  captureRejection,
  containsStringRecursively,
  expectRejectsWithoutSecret,
  getBankSync,
  getPersonalClientInfo,
  textResponse,
} from "../../../tests/support/transport.js";
import { MonobankApiError } from "../../errors/monobank-api-error.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankTransport } from "../transport.js";

describe("MonobankTransport response handling", () => {
  it("returns parsed JSON after schema validation succeeds", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ ok: true, extra: "preserved" }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).resolves.toEqual({
      ok: true,
      extra: "preserved",
    });
  });

  it("turns malformed successful JSON into a response validation error", async () => {
    const fetch = createFetchSequence([
      textResponse("{not-json", {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });
    const error = await captureRejection(getBankSync(transport));

    expect(error).toBeInstanceOf(MonobankResponseValidationError);
    expect(error).toMatchObject({
      endpoint: "/bank/sync",
      issues: [
        {
          code: "invalid_json",
          message: "Response body is not valid JSON.",
          path: [],
        },
      ],
      name: "MonobankResponseValidationError",
    });
  });

  it("turns schema failures into safe response validation errors", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ ok: "secret-token", rawAccountPayload: true }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });
    const error = await captureRejection(getBankSync(transport));

    expect(error).toBeInstanceOf(MonobankResponseValidationError);
    expect(error).toMatchObject({
      endpoint: "/bank/sync",
      issues: [
        {
          code: "invalid_type",
          path: ["ok"],
        },
      ],
      name: "MonobankResponseValidationError",
    });
    expect(containsStringRecursively(error, "secret-token")).toBe(false);
    expect(containsStringRecursively(error, "rawAccountPayload")).toBe(false);
  });

  it("uses errorDescription from JSON error responses", async () => {
    const fetch = createFetchSequence([
      jsonResponse(
        { errorDescription: "Too many requests for this endpoint" },
        {
          headers: { "Retry-After": "60", "X-Token": "secret-token" },
          status: 429,
        },
      ),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getPersonalClientInfo(transport)).rejects.toMatchObject({
      headers: {
        "content-type": "application/json",
        "retry-after": "60",
      },
      retryAfterMs: 60_000,
      status: 429,
      upstreamMessage: "Too many requests for this endpoint",
    });
  });

  it("preserves public upstream diagnostics when no token is configured", async () => {
    const fetch = createFetchSequence([
      jsonResponse(
        { errorDescription: "Public endpoint unavailable" },
        { status: 503 },
      ),
    ]);
    const transport = new MonobankTransport({ fetch });

    await expect(getBankSync(transport)).rejects.toMatchObject({
      status: 503,
      upstreamMessage: "Public endpoint unavailable",
    });
  });

  it("falls back to bounded JSON text when JSON errors omit errorDescription", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ message: "Plain upstream JSON error" }, { status: 400 }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toMatchObject({
      upstreamMessage: '{"message":"Plain upstream JSON error"}',
    });
  });

  it("keeps at most 1024 safe characters from text error responses", async () => {
    const body = `${"a".repeat(1_024)}secret-token${"b".repeat(16)}`;
    const fetch = createFetchSequence([
      textResponse(body, {
        headers: { "Content-Type": "text/plain" },
        status: 500,
      }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getPersonalClientInfo(transport)).rejects.toMatchObject({
      upstreamMessage: "a".repeat(1_024),
    });
  });

  it.each([
    ["HTML", "<html><body>bad gateway</body></html>"],
    ["empty", ""],
  ])("defensively parses %s error bodies", async (_, body) => {
    const fetch = createFetchSequence([
      textResponse(body, {
        headers: { "Content-Type": "text/html" },
        status: 502,
      }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toBeInstanceOf(
      MonobankApiError,
    );
  });

  it("handles unreadable error bodies without retaining the raw response", async () => {
    const unreadableResponse = {
      headers: new Headers(),
      ok: false,
      status: 503,
      text: async () => Promise.reject(new Error("Body stream failed")),
    } as Response;
    const fetch = createFetchSequence([unreadableResponse]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toMatchObject({
      status: 503,
      upstreamMessage: undefined,
    });
  });

  it("keeps ordinary non-abort DOMException body failures as unreadable error bodies", async () => {
    const unreadableResponse = {
      headers: new Headers(),
      ok: false,
      status: 503,
      text: async () =>
        Promise.reject(new DOMException("Stream lost", "NetworkError")),
    } as Response;
    const fetch = createFetchSequence([unreadableResponse]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toMatchObject({
      status: 503,
      upstreamMessage: undefined,
    });
  });

  it("does not expose token text from thrown API errors", async () => {
    const fetch = createFetchSequence([
      jsonResponse(
        { errorDescription: "token secret-token was rejected" },
        {
          headers: { "X-Token": "secret-token" },
          status: 401,
        },
      ),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expectRejectsWithoutSecret(getPersonalClientInfo(transport));
  });
});
