import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { GetAcquiringQrDetailsInput } from "./get-qr-details.js";
import { createAcquiringQrDetailsEndpoint } from "./get-qr-details.js";

function asInput(value: unknown): GetAcquiringQrDetailsInput {
  return value as GetAcquiringQrDetailsInput;
}

describe("Acquiring QR details request", () => {
  it("encodes the QR cashier identifier into the query string", () => {
    expect(createAcquiringQrDetailsEndpoint({ qrId: "XJ_DiM4rTd5V" })).toBe(
      "/api/merchant/qr/details?qrId=XJ_DiM4rTd5V",
    );
    expect(createAcquiringQrDetailsEndpoint({ qrId: "XJ/DiM+4rTd5V" })).toBe(
      "/api/merchant/qr/details?qrId=XJ%2FDiM%2B4rTd5V",
    );
  });

  it.each(["", " XJ_DiM4rTd5V", "XJ_DiM4rTd5V ", "   "])(
    "rejects QR cashier identifier %j before Fetch",
    (qrId) => {
      expect(() => createAcquiringQrDetailsEndpoint({ qrId })).toThrow(
        MonobankValidationError,
      );
    },
  );

  it.each([
    { name: "numeric identifier", value: { qrId: 42 } },
    { name: "null identifier", value: { qrId: null } },
    { name: "missing identifier", value: {} },
    { name: "missing input", value: undefined },
  ])("rejects $name before Fetch", ({ value }) => {
    expect(() => createAcquiringQrDetailsEndpoint(asInput(value))).toThrow(
      MonobankValidationError,
    );
  });

  it("reports the endpoint and issue without leaking the identifier", () => {
    expect(() =>
      createAcquiringQrDetailsEndpoint({ qrId: " secret-qr " }),
    ).toThrow(
      expect.objectContaining({
        endpoint: "/api/merchant/qr/details",
        issues: [
          "qrId must be a nonempty string without surrounding whitespace",
        ],
      }),
    );
  });
});
