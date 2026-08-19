import { describe, expect, it } from "vitest";

import { acquiringSplitReceiverListFixture } from "../../../tests/fixtures/acquiring/small-groups.js";
import { createAcquiringTestClient } from "../../../tests/support/acquiring-client.js";
import { expectCallerCancellation } from "../../../tests/support/caller-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";

describe("MonobankAcquiringSplit", () => {
  it("lists the split-payment receivers", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringSplitReceiverListFixture),
    ]);

    await expect(
      createAcquiringTestClient(fetch).split.listReceivers(),
    ).resolves.toEqual(acquiringSplitReceiverListFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/split-receiver/list",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("accepts a receiver carrying only its identifier", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ list: [{ splitReceiverId: "sr_aB3dC5eF7g" }] }),
    ]);

    await expect(
      createAcquiringTestClient(fetch).split.listReceivers(),
    ).resolves.toEqual({
      list: [{ splitReceiverId: "sr_aB3dC5eF7g" }],
    });
  });

  it("rejects a receiver without an identifier", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ list: [{ name: "FOP Ivanov Ivan Ivanovych" }] }),
    ]);

    await expect(
      createAcquiringTestClient(fetch).split.listReceivers(),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("cancels the receiver list through the caller's signal", async () => {
    await expectCallerCancellation((client, signal) =>
      client.split.listReceivers({ signal }),
    );
  });
});
