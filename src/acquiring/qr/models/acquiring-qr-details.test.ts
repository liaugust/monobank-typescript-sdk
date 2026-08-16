import { describe, expect, it } from "vitest";

import { acquiringQrDetailsFixture } from "../../../../tests/fixtures/acquiring/qr.js";
import { acquiringQrDetailsSchema } from "./acquiring-qr-details.js";

describe("Acquiring QR details schema", () => {
  it("parses complete and minimal documented details", () => {
    expect(acquiringQrDetailsSchema.parse(acquiringQrDetailsFixture)).toEqual(
      acquiringQrDetailsFixture,
    );
    expect(acquiringQrDetailsSchema.parse({ shortQrId: "OBJE" })).toEqual({
      shortQrId: "OBJE",
    });
  });

  it.each([
    { name: "missing shortQrId", value: { invoiceId: "4EwIUTA12JIZ" } },
    { name: "numeric shortQrId", value: { shortQrId: 42 } },
    {
      name: "numeric invoice identifier",
      value: { invoiceId: 42, shortQrId: "OBJE" },
    },
    {
      name: "fractional amount",
      value: { amount: 42.5, shortQrId: "OBJE" },
    },
    {
      name: "fractional currency code",
      value: { ccy: 980.5, shortQrId: "OBJE" },
    },
  ])("rejects $name", ({ value }) => {
    expect(acquiringQrDetailsSchema.safeParse(value).success).toBe(false);
  });

  it("preserves additive response fields", () => {
    const payload = {
      ...acquiringQrDetailsFixture,
      reference: "order-42",
    } as const;

    expect(acquiringQrDetailsSchema.parse(payload)).toEqual(payload);
  });
});
