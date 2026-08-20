import { describe, expect, it } from "vitest";

import { expectInstallmentsCancellation } from "../../../tests/support/caller-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestBody,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { createInstallmentsTestClient } from "../../../tests/support/installments-client.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";

const orderId = "fa4a8249-336e-4e6d-9b85-79bc8be62377";

const orderStateFixture = {
  message: null,
  order_id: orderId,
  order_sub_state: "WAITING_FOR_STORE_CONFIRM",
  state: "IN_PROCESS",
} as const;

const orderDataFixture = {
  create_timestamp: null,
  iban: "UA123456789012345678901234567",
  invoice_date: "2024-01-23",
  invoice_number: "INV-001234",
  maskedCard: "5375 41** **** 1234",
  point_id: "STORE-001",
  reverse_list: [{ sum: 500, timestamp: null }],
  source: "INTERNET",
  store_order_id: "ORD-2024-001234",
  total_sum: 2_499.99,
} as const;

const createInput = {
  available_programs: [
    { available_parts_count: [3, 6, 10], type: "payment_installments" },
  ],
  client_phone: "+380501234567",
  invoice: {
    date: "2024-01-15",
    number: "INV-2024-001234",
    point_id: "STORE-001",
    source: "INTERNET",
  },
  products: [{ count: 2, name: "TV", sum: 9_999.99 }],
  store_order_id: "ORD-2024-001234",
  total_sum: 2_499.99,
} as const;

describe("MonobankInstallmentsOrders", () => {
  it("creates an order and sends hryvnia sums unchanged", async () => {
    const fetch = createFetchSequence([jsonResponse({ order_id: orderId })]);

    await expect(
      createInstallmentsTestClient(fetch).orders.create(createInput),
    ).resolves.toEqual({ order_id: orderId });
    expect(firstRequestUrl(fetch).href).toBe(
      "https://u2.monobank.com.ua/api/order/create",
    );
    expect(firstRequestBody(fetch)).toEqual(createInput);
  });

  it("forwards nested fields the documented sample only hints at", async () => {
    const fetch = createFetchSequence([jsonResponse({ order_id: orderId })]);

    await createInstallmentsTestClient(fetch).orders.create({
      ...createInput,
      additional_params: { ext_initial_sum: 500, nds: 416.67 },
      financial_company_merchant_info: {
        edrpou_code: "12345678",
        iban_account: "UA123456789012345678901234567",
        store_name: "Shop",
      },
      invoice: { ...createInput.invoice, undocumented_extra: "kept" },
      result_callback: "https://shop.example.test/callback",
    });

    const body = firstRequestBody(fetch) as Record<string, unknown>;
    const invoice = body["invoice"] as Record<string, unknown>;

    expect(invoice["undocumented_extra"]).toBe("kept");
    expect(body["additional_params"]).toEqual({
      ext_initial_sum: 500,
      nds: 416.67,
    });
    expect(body["result_callback"]).toBe("https://shop.example.test/callback");
  });

  it("rejects create input Monobank documents as invalid", async () => {
    const fetch = createFetchSequence([]);
    const client = createInstallmentsTestClient(fetch);

    await expect(
      client.orders.create({ ...createInput, total_sum: 1.5 }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.orders.create({ ...createInput, store_order_id: "" }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.orders.create({ ...createInput, store_order_id: "x".repeat(65) }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.orders.create({ ...createInput, client_phone: "0501234567" }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.orders.create({ ...createInput, available_programs: [] }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.orders.create({ ...createInput, products: [] }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.orders.create({
        ...createInput,
        result_callback: "not-a-url",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.orders.create({
        ...createInput,
        result_callback: "ftp://shop.example.test/callback",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads, confirms, and rejects an order through one shared shape", async () => {
    for (const [method, path] of [
      ["getState", "state"],
      ["confirm", "confirm"],
      ["reject", "reject"],
    ] as const) {
      const fetch = createFetchSequence([jsonResponse(orderStateFixture)]);
      const client = createInstallmentsTestClient(fetch);

      await expect(
        client.orders[method]({ order_id: orderId }),
      ).resolves.toEqual(orderStateFixture);
      expect(firstRequestUrl(fetch).href).toBe(
        `https://u2.monobank.com.ua/api/order/${path}`,
      );
      expect(firstRequestBody(fetch)).toEqual({ order_id: orderId });
    }
  });

  it("accepts an order state carrying only its identifier", async () => {
    const fetch = createFetchSequence([jsonResponse({ order_id: orderId })]);

    await expect(
      createInstallmentsTestClient(fetch).orders.getState({
        order_id: orderId,
      }),
    ).resolves.toEqual({ order_id: orderId });
  });

  it("rejects an order state without an identifier", async () => {
    const fetch = createFetchSequence([jsonResponse({ state: "SUCCESS" })]);

    await expect(
      createInstallmentsTestClient(fetch).orders.getState({
        order_id: orderId,
      }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("reads settlement details from both documented endpoints", async () => {
    for (const [method, path] of [
      ["getData", "data"],
      ["getInfo", "info"],
    ] as const) {
      const fetch = createFetchSequence([jsonResponse(orderDataFixture)]);
      const client = createInstallmentsTestClient(fetch);
      const data = await client.orders[method]({ order_id: orderId });

      expect(data).toEqual(orderDataFixture);
      expect(data.create_timestamp).toBeNull();
      expect(data.maskedCard).toBe("5375 41** **** 1234");
      expect(firstRequestUrl(fetch).href).toBe(
        `https://u2.monobank.com.ua/api/order/${path}`,
      );
    }
  });

  it("reports whether an order is paid and card-refundable", async () => {
    const fetch = createFetchSequence([
      jsonResponse({
        bank_can_return_money_to_card: true,
        fully_paid: true,
      }),
    ]);

    await expect(
      createInstallmentsTestClient(fetch).orders.checkPaid({
        order_id: orderId,
      }),
    ).resolves.toEqual({
      bank_can_return_money_to_card: true,
      fully_paid: true,
    });
    expect(firstRequestUrl(fetch).href).toBe(
      "https://u2.monobank.com.ua/api/order/check/paid",
    );
  });

  it("rejects a checkPaid response missing the required fully_paid field", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ bank_can_return_money_to_card: true }),
    ]);

    await expect(
      createInstallmentsTestClient(fetch).orders.checkPaid({
        order_id: orderId,
      }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("returns goods with its documented parameters", async () => {
    const fetch = createFetchSequence([jsonResponse({ status: "OK" })]);

    await expect(
      createInstallmentsTestClient(fetch).orders.returnGoods({
        additional_params: { nds: 208.42 },
        order_id: orderId,
        return_money_to_card: true,
        store_return_id: "RET-12345",
        sum: 1_250.5,
      }),
    ).resolves.toEqual({ status: "OK" });
    expect(firstRequestUrl(fetch).href).toBe(
      "https://u2.monobank.com.ua/api/order/return",
    );
    expect(firstRequestBody(fetch)).toEqual({
      additional_params: { nds: 208.42 },
      order_id: orderId,
      return_money_to_card: true,
      store_return_id: "RET-12345",
      sum: 1_250.5,
    });
  });

  it("rejects a returnGoods response missing the required status field", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);

    await expect(
      createInstallmentsTestClient(fetch).orders.returnGoods({
        order_id: orderId,
        return_money_to_card: true,
        store_return_id: "RET-12345",
        sum: 1_250.5,
      }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("rejects a return below the documented minimum", async () => {
    const fetch = createFetchSequence([]);
    const client = createInstallmentsTestClient(fetch);

    await expect(
      client.orders.returnGoods({
        order_id: orderId,
        return_money_to_card: false,
        store_return_id: "RET-1",
        sum: 0.5,
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.orders.returnGoods({
        order_id: orderId,
        return_money_to_card: false,
        store_return_id: "",
        sum: 10,
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an order identifier that is not a UUID", async () => {
    const fetch = createFetchSequence([]);
    const client = createInstallmentsTestClient(fetch);

    for (const candidate of ["", "order-42", `${orderId} `, orderId.slice(1)]) {
      await expect(
        client.orders.getState({ order_id: candidate }),
      ).rejects.toBeInstanceOf(MonobankValidationError);
    }

    await expect(
      client.orders.returnGoods({
        order_id: "order-42",
        return_money_to_card: false,
        store_return_id: "RET-1",
        sum: 10,
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps a rejected order identifier out of the error", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createInstallmentsTestClient(fetch).orders.confirm({
        order_id: "not-a-uuid",
      }),
    ).rejects.toMatchObject({ issues: ["order_id must be a UUID"] });
  });

  it("cancels each order request through the caller's signal", async () => {
    await expectInstallmentsCancellation((client, signal) =>
      client.orders.create(createInput, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.orders.getState({ order_id: orderId }, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.orders.confirm({ order_id: orderId }, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.orders.reject({ order_id: orderId }, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.orders.getData({ order_id: orderId }, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.orders.getInfo({ order_id: orderId }, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.orders.checkPaid({ order_id: orderId }, { signal }),
    );
    await expectInstallmentsCancellation((client, signal) =>
      client.orders.returnGoods(
        {
          order_id: orderId,
          return_money_to_card: false,
          store_return_id: "RET-1",
          sum: 10,
        },
        { signal },
      ),
    );
  });
});
