import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { ResetAcquiringQrAmountInput } from "./reset-qr-amount.js";
import {
  createResetAcquiringQrAmountBody,
  resetAcquiringQrAmountEndpoint,
} from "./reset-qr-amount.js";

describe("Acquiring QR amount-reset request", () => {
  it("targets the documented mutating endpoint", () => {
    expect(resetAcquiringQrAmountEndpoint).toBe(
      "/api/merchant/qr/reset-amount",
    );
  });

  it("builds a body carrying only the validated identifier", () => {
    expect(createResetAcquiringQrAmountBody({ qrId: "XJ_DiM4rTd5V" })).toEqual({
      qrId: "XJ_DiM4rTd5V",
    });
  });

  it("drops caller fields outside the documented body", () => {
    expect(
      createResetAcquiringQrAmountBody({
        extra: "not sent upstream",
        qrId: "XJ_DiM4rTd5V",
      } as ResetAcquiringQrAmountInput),
    ).toEqual({ qrId: "XJ_DiM4rTd5V" });
  });

  it("reports the reset endpoint when the identifier is rejected", () => {
    expect(() => createResetAcquiringQrAmountBody({ qrId: " " })).toThrow(
      expect.objectContaining({ endpoint: resetAcquiringQrAmountEndpoint }),
    );
    expect(() => createResetAcquiringQrAmountBody({ qrId: "" })).toThrow(
      MonobankValidationError,
    );
  });
});
