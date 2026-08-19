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

const reportFixture = {
  orders: [
    {
      commission: 62.5,
      commission_percent: 2.5,
      invoice_number: "INV-001234",
      odb_contract_number: "KD-2024-001234",
      operation_timestamp: null,
      order_date: "2024-01-15",
      order_id: "fa4a8249-336e-4e6d-9b85-79bc8be62377",
      pay_parts: 10,
      total_sum: 2_499.99,
      transferred_sum: 2_437.49,
    },
  ],
} as const;

describe("MonobankInstallmentsReports", () => {
  it("reads the settled orders for one day", async () => {
    const fetch = createFetchSequence([jsonResponse(reportFixture)]);

    const report = await createInstallmentsTestClient(
      fetch,
    ).reports.getStoreReport({ date: "2024-01-15" });

    expect(report).toEqual(reportFixture);
    expect(report.orders[0]?.operation_timestamp).toBeNull();
    expect(report.orders[0]?.total_sum).toBe(2_499.99);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://u2.monobank.com.ua/api/store/report",
    );
    expect(firstRequestBody(fetch)).toEqual({ date: "2024-01-15" });
  });

  it("accepts a day with no settled orders", async () => {
    const fetch = createFetchSequence([jsonResponse({ orders: [] })]);

    await expect(
      createInstallmentsTestClient(fetch).reports.getStoreReport({
        date: "2024-01-15",
      }),
    ).resolves.toEqual({ orders: [] });
  });

  it("rejects a report without its order list", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);

    await expect(
      createInstallmentsTestClient(fetch).reports.getStoreReport({
        date: "2024-01-15",
      }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("rejects a date that is not a plain calendar day", async () => {
    const fetch = createFetchSequence([]);
    const client = createInstallmentsTestClient(fetch);

    for (const date of [
      "2024-01-15T00:00:00Z",
      "15-01-2024",
      "2024-1-5",
      "",
      " 2024-01-15",
    ]) {
      await expect(
        client.reports.getStoreReport({ date }),
      ).rejects.toBeInstanceOf(MonobankValidationError);
    }

    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels the report request through the caller's signal", async () => {
    await expectInstallmentsCancellation((client, signal) =>
      client.reports.getStoreReport({ date: "2024-01-15" }, { signal }),
    );
  });
});
