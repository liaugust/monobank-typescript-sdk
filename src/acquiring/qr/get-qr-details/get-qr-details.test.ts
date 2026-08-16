import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { createAcquiringQrDetailsEndpoint } from "./get-qr-details.js";

describe("Acquiring QR details request", () => {
  it("encodes the QR cashier identifier into the query string", () => {
    expect(createAcquiringQrDetailsEndpoint({ qrId: "XJ_DiM4rTd5V" })).toBe(
      "/api/merchant/qr/details?qrId=XJ_DiM4rTd5V",
    );
    expect(createAcquiringQrDetailsEndpoint({ qrId: "XJ/DiM+4rTd5V" })).toBe(
      "/api/merchant/qr/details?qrId=XJ%2FDiM%2B4rTd5V",
    );
  });

  it("reports the details endpoint when the identifier is rejected", () => {
    expect(() => createAcquiringQrDetailsEndpoint({ qrId: " " })).toThrow(
      expect.objectContaining({ endpoint: "/api/merchant/qr/details" }),
    );
    expect(() => createAcquiringQrDetailsEndpoint({ qrId: "" })).toThrow(
      MonobankValidationError,
    );
  });
});
