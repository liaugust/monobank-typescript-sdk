import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { expectInstallmentsCancellation } from "../../../tests/support/caller-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestBody,
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { createInstallmentsTestClient } from "../../../tests/support/installments-client.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";

const storeSecret = "secret_98765432--123-123";

function expectedSignature(body: unknown): string {
  return createHmac("sha256", storeSecret)
    .update(JSON.stringify(body))
    .digest("base64");
}

describe("MonobankInstallmentsClients", () => {
  it("signs the request body with the store secret", async () => {
    const fetch = createFetchSequence([jsonResponse({ found: true })]);

    await createInstallmentsTestClient(fetch).clients.validateV2({
      phone: "+380501234567",
    });

    const headers = firstRequestHeaders(fetch);

    expect(headers.get("store-id")).toBe("test_store_with_confirm");
    expect(headers.get("signature")).toBe(
      expectedSignature({ phone: "+380501234567" }),
    );
    expect(firstRequestUrl(fetch).href).toBe(
      "https://u2.monobank.com.ua/api/v2/client/validate",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("signs the exact bytes it sends", async () => {
    const fetch = createFetchSequence([jsonResponse({ found: true })]);

    await createInstallmentsTestClient(fetch).clients.validateV2({
      phone: "+380501234567",
    });

    const sent = fetch.mock.calls[0]?.[1]?.body;

    expect(typeof sent).toBe("string");
    expect(firstRequestHeaders(fetch).get("signature")).toBe(
      createHmac("sha256", storeSecret)
        .update(sent as string)
        .digest("base64"),
    );
  });

  it("sends no token header on a signed request", async () => {
    const fetch = createFetchSequence([jsonResponse({ found: true })]);

    await createInstallmentsTestClient(fetch).clients.validateV2({
      phone: "+380501234567",
    });

    expect(firstRequestHeaders(fetch).get("X-Token")).toBeNull();
    expect(firstRequestHeaders(fetch).get("X-Sign")).toBeNull();
  });

  it("returns a found client's identity from the v1 lookup", async () => {
    const found = {
      client: {
        first_name: "Oleksandr",
        inn: "1234567890",
        last_name: "Sidorenko",
        middle_name: "Ihorovych",
      },
      found: true,
    };
    const fetch = createFetchSequence([jsonResponse(found)]);

    await expect(
      createInstallmentsTestClient(fetch).clients.validate({
        phone: "+380501234567",
      }),
    ).resolves.toEqual(found);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://u2.monobank.com.ua/api/client/validate",
    );
    expect(firstRequestBody(fetch)).toEqual({ phone: "+380501234567" });
  });

  it("accepts a v1 lookup that found nobody and carries no identity", async () => {
    const fetch = createFetchSequence([jsonResponse({ found: false })]);

    await expect(
      createInstallmentsTestClient(fetch).clients.validate({
        phone: "+380501234567",
      }),
    ).resolves.toEqual({ found: false });
  });

  it("rejects a lookup answer without the documented flag", async () => {
    const fetch = createFetchSequence([jsonResponse({ client: {} })]);

    await expect(
      createInstallmentsTestClient(fetch).clients.validateV2({
        phone: "+380501234567",
      }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("rejects a phone number that is not in international format", async () => {
    const fetch = createFetchSequence([]);
    const client = createInstallmentsTestClient(fetch);

    for (const phone of [
      "0501234567",
      "+38050123456789012",
      "+38050",
      "+380 50 123 4567",
      "",
      "+380501234567 ",
    ]) {
      await expect(client.clients.validateV2({ phone })).rejects.toBeInstanceOf(
        MonobankValidationError,
      );
    }

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an untyped phone value before Fetch", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createInstallmentsTestClient(fetch).clients.validate({
        phone: 380_501_234_567 as unknown as string,
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels each lookup through the caller's signal", async () => {
    await expectInstallmentsCancellation((client, signal) =>
      client.clients.validate({ phone: "+380501234567" }, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.clients.validateV2({ phone: "+380501234567" }, { signal }),
    );
  });
});
