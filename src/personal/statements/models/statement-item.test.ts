import { describe, expect, it } from "vitest";

import { statementItemFixture } from "../../../../tests/fixtures/personal-api.js";
import { statementItemSchema, statementItemsSchema } from "./statement-item.js";

describe("statement item schema", () => {
  it("accepts a fully populated Personal statement item with optional counterparty metadata", () => {
    expect(statementItemSchema.parse(statementItemFixture)).toEqual(
      statementItemFixture,
    );
    expect(statementItemsSchema.parse([statementItemFixture])).toEqual([
      statementItemFixture,
    ]);
  });

  it("accepts omitted optional statement metadata", () => {
    const minimalStatementItem: Record<string, unknown> = {
      ...statementItemFixture,
    };

    delete minimalStatementItem["comment"];
    delete minimalStatementItem["counterEdrpou"];
    delete minimalStatementItem["counterIban"];
    delete minimalStatementItem["counterName"];
    delete minimalStatementItem["invoiceId"];
    delete minimalStatementItem["receiptId"];

    expect(statementItemSchema.parse(minimalStatementItem)).toEqual(
      minimalStatementItem,
    );
  });

  it("rejects malformed statement scalar fields", () => {
    const result = statementItemSchema.safeParse({
      ...statementItemFixture,
      amount: "-12345",
      currencyCode: "980",
      hold: "false",
      time: 1_785_542_400.5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["amount"] }),
          expect.objectContaining({ path: ["currencyCode"] }),
          expect.objectContaining({ path: ["hold"] }),
          expect.objectContaining({ path: ["time"] }),
        ]),
      );
    }
  });

  it("preserves unknown additive statement fields", () => {
    const payload = {
      ...statementItemFixture,
      merchantLogoUrl: "https://example.test/logo.png",
    } as const;

    expect(statementItemSchema.parse(payload)).toEqual(payload);
  });
});
