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

const orderId = "fa4a8249-336e-4e6d-9b85-79bc8be62377";

const letterDataFixture = {
  expansion: {
    bank: {
      agreement: "123-123-1234",
      agreement_date: "2020-01-25",
      available_parts_count: 12,
      bank_executive: "Sidorenko Oleksandr",
      bank_id: "12345678",
      bank_name: "any bank",
      credit_amount: 1_234.56,
      credit_product: "MONO 234",
      customer_pay_amount: 123.35,
      product_types: "payment_installments",
    },
    customer: {
      document: {
        id_card: {
          date_of_issue: "1901-01-29",
          issued: "1234",
          number: "123456",
          registry_number: "12345678-12345",
          valid_until: "2025-01-25",
        },
        passport: {
          date_of_issue: "1901-01-29",
          issued: "1234",
          number: "123456",
          series: "AA",
        },
      },
      first_name: "Oleksandr",
      inn: "AA123456",
      last_name: "Sidorenko",
      middle_name: "Ihorovych",
    },
    invoice: {
      invoice_amount: 1_234.56,
      invoice_date: "2018-01-25",
      invoice_number: "1234-1234-1234",
    },
    payment_destination: {
      dest_acc_number: "1234567890123",
      dest_bank_name: "any bank",
      dest_id: "12345678",
      dest_mfo: "123456",
      dest_name: "any super company",
    },
    sign: "12E0F76458C6D1E4",
    stamp: "1199A0F5E7C4A212",
  },
  header: {
    answer_datetime: null,
    contract_date: "2018-01-25",
    contract_number: "12345678",
    from_organization: "Monobank",
    organization_id: "21133352",
    request_id: orderId,
  },
} as const;

function pdfResponse(
  bytes: Uint8Array<ArrayBuffer>,
  contentType = "application/pdf",
) {
  return new Response(bytes, { headers: { "Content-Type": contentType } });
}

describe("MonobankInstallmentsLetters", () => {
  it("reads letter source data from both documented endpoints", async () => {
    for (const [method, path] of [
      ["getData", "/api/order/data/for/guarantee/letter"],
      ["getDataV2", "/api/v2/order/data/for/guarantee/letter"],
    ] as const) {
      const fetch = createFetchSequence([jsonResponse(letterDataFixture)]);
      const client = createInstallmentsTestClient(fetch);
      const data = await client.letters[method]({ order_id: orderId });

      expect(data).toEqual(letterDataFixture);
      expect(data.header?.answer_datetime).toBeNull();
      expect(firstRequestUrl(fetch).href).toBe(
        `https://u2.monobank.com.ua${path}`,
      );
      expect(firstRequestBody(fetch)).toEqual({ order_id: orderId });
    }
  });

  it("forwards an invoice reference whole", async () => {
    const fetch = createFetchSequence([jsonResponse(letterDataFixture)]);

    await createInstallmentsTestClient(fetch).letters.getData({
      invoice: { date: "2024-01-23", number: "INV-002334", extra: "kept" },
      order_id: orderId,
    });

    expect(firstRequestBody(fetch)).toEqual({
      invoice: { date: "2024-01-23", extra: "kept", number: "INV-002334" },
      order_id: orderId,
    });
  });

  it("accepts letter data carrying nothing at all", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);

    await expect(
      createInstallmentsTestClient(fetch).letters.getData({
        order_id: orderId,
      }),
    ).resolves.toEqual({});
  });

  it("downloads the letter as bytes with its declared content type", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nfake");
    const fetch = createFetchSequence([pdfResponse(bytes)]);

    const letter = await createInstallmentsTestClient(fetch).letters.download({
      order_id: orderId,
    });

    expect(letter.bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(letter.bytes)).toBe("%PDF-1.7\nfake");
    expect(letter.contentType).toBe("application/pdf");
    expect(firstRequestUrl(fetch).href).toBe(
      "https://u2.monobank.com.ua/api/order/guarantee/letter",
    );
    expect(firstRequestHeaders(fetch).get("Accept")).toBe("application/pdf");
  });

  it("reports the content type Monobank actually declared", async () => {
    const bytes = new TextEncoder().encode("not-really-a-pdf");
    const fetch = createFetchSequence([
      pdfResponse(bytes, "application/octet-stream"),
    ]);

    const letter = await createInstallmentsTestClient(fetch).letters.download({
      order_id: orderId,
    });

    expect(letter.contentType).toBe("application/octet-stream");
  });

  it("surfaces a missing content type as undefined", async () => {
    const fetch = createFetchSequence([
      new Response(new TextEncoder().encode("bytes")),
    ]);

    const letter = await createInstallmentsTestClient(fetch).letters.download({
      order_id: orderId,
    });

    expect(letter.contentType).toBeUndefined();
  });

  it("rejects an empty successful document as a broken response", async () => {
    const fetch = createFetchSequence([
      new Response(new Uint8Array(), {
        headers: { "Content-Type": "application/pdf" },
      }),
    ]);

    await expect(
      createInstallmentsTestClient(fetch).letters.download({
        order_id: orderId,
      }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("rejects a malformed letter payload", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ header: { organization_id: 21_133_352 } }),
    ]);

    await expect(
      createInstallmentsTestClient(fetch).letters.getDataV2({
        order_id: orderId,
      }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("rejects an order identifier that is not a UUID", async () => {
    const fetch = createFetchSequence([]);
    const client = createInstallmentsTestClient(fetch);

    for (const method of ["getData", "getDataV2", "download"] as const) {
      await expect(
        client.letters[method]({ order_id: "order-42" }),
      ).rejects.toBeInstanceOf(MonobankValidationError);
    }

    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels each letter request through the caller's signal", async () => {
    await expectInstallmentsCancellation((client, signal) =>
      client.letters.getData({ order_id: orderId }, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.letters.getDataV2({ order_id: orderId }, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.letters.download({ order_id: orderId }, { signal }),
    );
  });
});
