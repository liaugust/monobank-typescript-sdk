import { describe, expect, it } from "vitest";

import { acquiringStatementFixture } from "../../../../tests/fixtures/acquiring/statements.js";
import {
  AcquiringPaymentScheme,
  acquiringStatementSchema,
  AcquiringStatementStatus,
} from "./acquiring-statement.js";

describe("Acquiring statement schema", () => {
  it("parses complete and minimal documented statement responses", () => {
    expect(acquiringStatementSchema.parse(acquiringStatementFixture)).toEqual(
      acquiringStatementFixture,
    );
    expect(
      acquiringStatementSchema.parse({
        list: [
          {
            amount: 4_200,
            ccy: 980,
            date: "2026-08-16T12:00:00Z",
            invoiceId: "invoice-42",
            maskedPan: "444403******1902",
            paymentScheme: "full",
            status: AcquiringStatementStatus.Success,
          },
        ],
      }),
    ).toEqual({
      list: [
        {
          amount: 4_200,
          ccy: 980,
          date: "2026-08-16T12:00:00Z",
          invoiceId: "invoice-42",
          maskedPan: "444403******1902",
          paymentScheme: "full",
          status: "success",
        },
      ],
    });
  });

  it("rejects malformed item and nested cancellation fields", () => {
    const item = acquiringStatementFixture.list[0];
    const result = acquiringStatementSchema.safeParse({
      list: [
        {
          ...item,
          amount: "4200",
          cancelList: [{ ...item.cancelList[0], date: "yesterday" }],
          status: "unknown",
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["list", 0, "amount"] }),
          expect.objectContaining({
            path: ["list", 0, "cancelList", 0, "date"],
          }),
          expect.objectContaining({ path: ["list", 0, "status"] }),
        ]),
      );
    }
  });

  it("limits payment schemes to the documented wire values", () => {
    const item = acquiringStatementFixture.list[0];

    expect(
      acquiringStatementSchema.safeParse({
        list: [{ ...item, paymentScheme: "installments_unknown" }],
      }).success,
    ).toBe(false);
    expect(AcquiringPaymentScheme).toEqual({
      BnplLater30: "bnpl_later_30",
      BnplParts4: "bnpl_parts_4",
      Full: "full",
    });
  });

  it("preserves additive statement fields without claiming their types", () => {
    const payload = {
      list: [
        {
          ...acquiringStatementFixture.list[0],
          agentFee: 100,
          metadata: { orderSource: "mobile" },
          splitReceiverList: [
            {
              amount: 2_100,
              splitReceiverId: "receiver-42",
            },
          ],
        },
      ],
    } as const;

    expect(acquiringStatementSchema.parse(payload)).toEqual(payload);
  });
});
