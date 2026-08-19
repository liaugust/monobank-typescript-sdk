import { describe, expect, it } from "vitest";

import {
  importedMonopaySigningKeyFixture,
  monopaySigningKeyListFixture,
} from "../../../tests/fixtures/acquiring/small-groups.js";
import { createAcquiringTestClient } from "../../../tests/support/acquiring-client.js";
import { expectCallerCancellation } from "../../../tests/support/caller-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestBody,
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";

const keyValue = "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0K";

describe("MonobankAcquiringMonopay", () => {
  it("lists the registered signing keys", async () => {
    const fetch = createFetchSequence([
      jsonResponse(monopaySigningKeyListFixture),
    ]);

    await expect(
      createAcquiringTestClient(fetch).monopay.listKeys(),
    ).resolves.toEqual(monopaySigningKeyListFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/monopay/pubkey-list",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("accepts a key list carrying only the documented minimum", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ result: [{ keyId: "28F91hHGtzoSFJ" }] }),
    ]);

    await expect(
      createAcquiringTestClient(fetch).monopay.listKeys(),
    ).resolves.toEqual({
      result: [{ keyId: "28F91hHGtzoSFJ" }],
    });
  });

  it("rejects a key list entry without an identifier", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ result: [{ keyName: "my_key" }] }),
    ]);

    await expect(
      createAcquiringTestClient(fetch).monopay.listKeys(),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("imports a key with its optional label and expiry", async () => {
    const fetch = createFetchSequence([
      jsonResponse(importedMonopaySigningKeyFixture),
    ]);

    await expect(
      createAcquiringTestClient(fetch).monopay.importKey({
        expiresAt: new Date("2026-02-02T12:04:05.000Z"),
        keyName: "widget-2026",
        keyValue,
      }),
    ).resolves.toEqual(importedMonopaySigningKeyFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/monopay/pubkey-import",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestBody(fetch)).toEqual({
      expiresAt: "2026-02-02T12:04:05.000Z",
      keyName: "widget-2026",
      keyValue,
    });
  });

  it("imports a key with nothing but its value", async () => {
    const fetch = createFetchSequence([
      jsonResponse(importedMonopaySigningKeyFixture),
    ]);

    await createAcquiringTestClient(fetch).monopay.importKey({ keyValue });

    expect(firstRequestBody(fetch)).toEqual({ keyValue });
  });

  it("forwards an offset expiry string unchanged", async () => {
    const fetch = createFetchSequence([
      jsonResponse(importedMonopaySigningKeyFixture),
    ]);

    await createAcquiringTestClient(fetch).monopay.importKey({
      expiresAt: "2026-02-02T15:04:05+03:00",
      keyValue,
    });

    expect(firstRequestBody(fetch)).toEqual({
      expiresAt: "2026-02-02T15:04:05+03:00",
      keyValue,
    });
  });

  it("rejects invalid import input before Fetch", async () => {
    const fetch = createFetchSequence([]);
    const client = createAcquiringTestClient(fetch);

    await expect(
      client.monopay.importKey({ keyValue: "" }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.monopay.importKey({ keyValue: ` ${keyValue}` }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.monopay.importKey({ keyName: "  ", keyValue }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.monopay.importKey({ expiresAt: "whenever", keyValue }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.monopay.importKey({
        expiresAt: new Date("not-a-date"),
        keyValue,
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.monopay.importKey({
        keyValue: 42 as unknown as string,
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps a rejected key value out of the error", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createAcquiringTestClient(fetch).monopay.importKey({
        keyValue: ` ${keyValue}`,
      }),
    ).rejects.toMatchObject({
      issues: [
        "keyValue must be a nonempty string without surrounding whitespace",
      ],
    });
  });

  it("deletes one signing key", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 200 })]);

    await expect(
      createAcquiringTestClient(fetch).monopay.deleteKey({
        keyId: "28F91hHGtzoSFJ",
      }),
    ).resolves.toBeUndefined();
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/monopay/pubkey-delete",
    );
    expect(firstRequestBody(fetch)).toEqual({ keyId: "28F91hHGtzoSFJ" });
  });

  it("rejects a deletion without an identifier", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createAcquiringTestClient(fetch).monopay.deleteKey({ keyId: " " }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels each monopay request through the caller's signal", async () => {
    await expectCallerCancellation((client, signal) =>
      client.monopay.listKeys({ signal }),
    );
    await expectCallerCancellation((client, signal) =>
      client.monopay.importKey({ keyValue }, { signal }),
    );
    await expectCallerCancellation((client, signal) =>
      client.monopay.deleteKey({ keyId: "28F91hHGtzoSFJ" }, { signal }),
    );
  });
});
