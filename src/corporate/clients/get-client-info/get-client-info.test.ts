import { describe, expect, it, vi } from "vitest";

import { clientInfoFixture } from "../../../../tests/fixtures/personal/client-info.js";
import { expectCorporateCancellation } from "../../../../tests/support/caller-cancellation.js";
import { createCorporateTestClient } from "../../../../tests/support/corporate-client.js";
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
import type { MonobankCorporateClient } from "../../client/monobank-corporate-client.js";

describe("clients.getInfo", () => {
  it("reads a granted client's identity with the request id in the payload", async () => {
    const fetch = createFetchSequence([jsonResponse(clientInfoFixture)]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = createCorporateTestClient(fetch, sign);

    const info = await client.clients.getInfo({ requestId: "grant-1" });

    expect(info).toEqual(clientInfoFixture);
    expect(firstRequestUrl(fetch).pathname).toBe("/personal/client-info");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");

    const headers = firstRequestHeaders(fetch);
    expect(headers.get("X-Key-Id")).toBe("corporate-key-id");
    expect(headers.get("X-Request-Id")).toBe("grant-1");
    expect(headers.has("X-Token")).toBe(false);
    expect(sign.mock.calls[0]?.[0]?.payload).toBe(
      `${headers.get("X-Time") ?? ""}grant-1/personal/client-info`,
    );
  });

  it.each([
    {
      name: "'client info'",
      start: (client: MonobankCorporateClient, signal: AbortSignal) =>
        client.clients.getInfo({ requestId: "grant-1" }, { signal }),
    },
    {
      name: "'client statements'",
      start: (client: MonobankCorporateClient, signal: AbortSignal) =>
        client.clients.getStatements(
          { from: 0, requestId: "grant-1" },
          { signal },
        ),
    },
  ])("passes caller cancellation to the $name request", async ({ start }) => {
    await expectCorporateCancellation(start);
  });

  it("rejects a blank request id before Fetch", async () => {
    const fetch = createFetchSequence([jsonResponse(clientInfoFixture)]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.clients.getInfo({ requestId: " " }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("surfaces a revoked grant as an API error", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ errorDescription: "forbidden" }, { status: 403 }),
    ]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.clients.getInfo({ requestId: "grant-1" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
