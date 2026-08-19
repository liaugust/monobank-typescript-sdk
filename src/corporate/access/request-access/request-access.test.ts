import { describe, expect, it, vi } from "vitest";

import { corporateTokenRequestFixture } from "../../../../tests/fixtures/corporate/access.js";
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
import { corporateTokenRequestSchema } from "./request-access.js";

function createClient(
  fetch: ReturnType<typeof createFetchSequence>,
  sign: CorporateSigner = () => "c2ln",
) {
  return new MonobankCorporateClient({
    fetch,
    keyId: "corporate-key-id",
    sign,
  });
}

describe("corporate token request schema", () => {
  it("accepts the documented access request response", () => {
    expect(
      corporateTokenRequestSchema.parse(corporateTokenRequestFixture),
    ).toEqual(corporateTokenRequestFixture);
  });

  it("accepts an empty response because no field is documented as required", () => {
    expect(corporateTokenRequestSchema.safeParse({}).success).toBe(true);
  });

  it("rejects malformed field types", () => {
    expect(
      corporateTokenRequestSchema.safeParse({ tokenRequestId: 42 }).success,
    ).toBe(false);
  });
});

describe("access.request", () => {
  it("initializes access with the time and url signed payload", async () => {
    const fetch = createFetchSequence([
      jsonResponse(corporateTokenRequestFixture),
    ]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = createClient(fetch, sign);

    const granted = await client.access.request();

    expect(granted).toEqual(corporateTokenRequestFixture);
    expect(firstRequestUrl(fetch).pathname).toBe("/personal/auth/request");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");

    const headers = firstRequestHeaders(fetch);
    expect(headers.get("X-Key-Id")).toBe("corporate-key-id");
    expect(headers.has("X-Request-Id")).toBe(false);
    expect(headers.has("X-Callback")).toBe(false);
    expect(sign.mock.calls[0]?.[0]?.payload).toBe(
      `${headers.get("X-Time") ?? ""}/personal/auth/request`,
    );
  });

  it("sends an optional callback URL the client approval will notify", async () => {
    const fetch = createFetchSequence([
      jsonResponse(corporateTokenRequestFixture),
    ]);
    const client = createClient(fetch);

    await client.access.request({
      callbackUrl: "https://example.com/mono/granted",
    });

    expect(firstRequestHeaders(fetch).get("X-Callback")).toBe(
      "https://example.com/mono/granted",
    );
  });

  it.each([
    ["a relative callback URL", "mono/granted"],
    ["a non-HTTP callback protocol", "ftp://example.com/granted"],
  ])("rejects %s before Fetch", async (_label, callbackUrl) => {
    const fetch = createFetchSequence([
      jsonResponse(corporateTokenRequestFixture),
    ]);
    const client = createClient(fetch);

    await expect(client.access.request({ callbackUrl })).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is never retried because it mutates the grant state", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ message: "server error" }, { status: 500 }),
    ]);
    const client = new MonobankCorporateClient({
      fetch,
      keyId: "corporate-key-id",
      retry: { baseDelayMs: 1, maxAttempts: 3, maxDelayMs: 2 },
      sign: () => "c2ln",
    });

    await expect(client.access.request()).rejects.toMatchObject({
      status: 500,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
