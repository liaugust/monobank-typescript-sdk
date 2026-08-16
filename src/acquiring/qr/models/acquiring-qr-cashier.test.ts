import { describe, expect, it } from "vitest";

import { acquiringQrCashierListFixture } from "../../../../tests/fixtures/acquiring/qr.js";
import {
  AcquiringQrAmountType,
  acquiringQrCashierListSchema,
  acquiringQrCashierSchema,
} from "./acquiring-qr-cashier.js";

describe("Acquiring QR cashier schemas", () => {
  it("parses the documented QR cashier list", () => {
    expect(
      acquiringQrCashierListSchema.parse(acquiringQrCashierListFixture),
    ).toEqual(acquiringQrCashierListFixture);
  });

  it.each(Object.values(AcquiringQrAmountType))(
    "parses the %j amount type",
    (amountType) => {
      expect(
        acquiringQrCashierSchema.parse({
          amountType,
          pageUrl: "https://pay.mbnk.biz/XJ_DiM4rTd5V",
          qrId: "XJ_DiM4rTd5V",
          shortQrId: "OBJE",
        }).amountType,
      ).toBe(amountType);
    },
  );

  it.each([
    {
      name: "missing shortQrId",
      value: {
        amountType: "fix",
        pageUrl: "https://pay.mbnk.biz/XJ_DiM4rTd5V",
        qrId: "XJ_DiM4rTd5V",
      },
    },
    {
      name: "missing qrId",
      value: {
        amountType: "fix",
        pageUrl: "https://pay.mbnk.biz/XJ_DiM4rTd5V",
        shortQrId: "OBJE",
      },
    },
    {
      name: "missing pageUrl",
      value: { amountType: "fix", qrId: "XJ_DiM4rTd5V", shortQrId: "OBJE" },
    },
    {
      name: "missing amountType",
      value: {
        pageUrl: "https://pay.mbnk.biz/XJ_DiM4rTd5V",
        qrId: "XJ_DiM4rTd5V",
        shortQrId: "OBJE",
      },
    },
    {
      name: "undocumented amount type",
      value: {
        amountType: "operator",
        pageUrl: "https://pay.mbnk.biz/XJ_DiM4rTd5V",
        qrId: "XJ_DiM4rTd5V",
        shortQrId: "OBJE",
      },
    },
    {
      name: "numeric page URL",
      value: {
        amountType: "fix",
        pageUrl: 42,
        qrId: "XJ_DiM4rTd5V",
        shortQrId: "OBJE",
      },
    },
    {
      name: "numeric short identifier",
      value: {
        amountType: "fix",
        pageUrl: "https://pay.mbnk.biz/XJ_DiM4rTd5V",
        qrId: "XJ_DiM4rTd5V",
        shortQrId: 42,
      },
    },
  ])("rejects $name", ({ value }) => {
    expect(acquiringQrCashierSchema.safeParse(value).success).toBe(false);
  });

  it("rejects a list containing a malformed cashier", () => {
    expect(
      acquiringQrCashierListSchema.safeParse({ list: [{ shortQrId: "OBJE" }] })
        .success,
    ).toBe(false);
  });

  it("accepts an empty list and requires the list wrapper", () => {
    expect(acquiringQrCashierListSchema.parse({ list: [] })).toEqual({
      list: [],
    });
    expect(acquiringQrCashierListSchema.safeParse({}).success).toBe(false);
  });

  it("preserves additive response fields", () => {
    const payload = {
      list: [
        {
          ...acquiringQrCashierListFixture.list[0],
          terminalCode: "0a8637b3bccb42aa93fdeb791b8b58e9",
        },
      ],
      requestId: "request-42",
    } as const;

    expect(acquiringQrCashierListSchema.parse(payload)).toEqual(payload);
  });
});
