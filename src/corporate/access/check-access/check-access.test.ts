import { describe, expect, it, vi } from "vitest";

import { expectCorporateCancellation } from "../../../../tests/support/caller-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../../tests/support/fetch-request-inspection.js";
import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { CorporateSigner } from "../../../transport/corporate-signer.js";
import { MonobankCorporateClient } from "../../client/monobank-corporate-client.js";

function createClient(
  fetch: ReturnType<typeof createFetchSequence>,
  sign: CorporateSigner = () => "c2ln",
  retry?: { baseDelayMs: number; maxAttempts: number; maxDelayMs: number },
) {
  return new MonobankCorporateClient({
    fetch,
    keyId: "corporate-key-id",
    sign,
    ...(retry === undefined ? {} : { retry }),
  });
}

describe("access.check", () => {
  it("signs the request identifier into the payload for a delegated read", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = createClient(fetch, sign);

    await client.access.check({ requestId: "uLkwh3NzFAfEkj7urj5C7AU_" });

    expect(firstRequestUrl(fetch).pathname).toBe("/personal/auth/request");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");

    const headers = firstRequestHeaders(fetch);
    expect(headers.get("X-Request-Id")).toBe("uLkwh3NzFAfEkj7urj5C7AU_");
    expect(sign.mock.calls[0]?.[0]?.payload).toBe(
      `${headers.get("X-Time") ?? ""}uLkwh3NzFAfEkj7urj5C7AU_/personal/auth/request`,
    );
  });

  it("resolves without a value because Monobank answers with an empty object", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createClient(fetch);

    await expect(
      client.access.check({ requestId: "uLkwh3NzFAfEkj7urj5C7AU_" }),
    ).resolves.toBeUndefined();
  });

  it("surfaces a pending grant as an API error rather than a value", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ errorDescription: "unauthorized" }, { status: 401 }),
    ]);
    const client = createClient(fetch);

    await expect(
      client.access.check({ requestId: "uLkwh3NzFAfEkj7urj5C7AU_" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("retries the safe status check when a policy is configured", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ message: "unavailable" }, { status: 503 }),
      jsonResponse({}),
    ]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = createClient(fetch, sign, {
      baseDelayMs: 1,
      maxAttempts: 2,
      maxDelayMs: 2,
    });

    await client.access.check({ requestId: "uLkwh3NzFAfEkj7urj5C7AU_" });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sign).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      name: "'request'",
      start: (client: MonobankCorporateClient, signal: AbortSignal) =>
        client.access.request({}, { signal }),
    },
    {
      name: "'check'",
      start: (client: MonobankCorporateClient, signal: AbortSignal) =>
        client.access.check({ requestId: "req-1" }, { signal }),
    },
  ])("passes caller cancellation to the $name request", async ({ start }) => {
    await expectCorporateCancellation(start);
  });

  it.each([
    ["an empty request identifier", ""],
    ["a padded request identifier", " req-1 "],
    ["an injecting request identifier", "req\r\nX-Token: x"],
  ])("rejects %s before Fetch", async (_label, requestId) => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createClient(fetch);

    await expect(client.access.check({ requestId })).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
