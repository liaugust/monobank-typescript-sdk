import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { GetAcquiringQrDetailsInput } from "./qr-identifier.js";
import { parseAcquiringQrIdentifier } from "./qr-identifier.js";

const endpoint = "/api/merchant/qr/test-endpoint";

function asInput(value: unknown): GetAcquiringQrDetailsInput {
  return value as GetAcquiringQrDetailsInput;
}

describe("Acquiring QR identifier validation", () => {
  it("returns the validated identifier unchanged", () => {
    expect(
      parseAcquiringQrIdentifier({ qrId: "XJ_DiM4rTd5V" }, endpoint),
    ).toEqual({ qrId: "XJ_DiM4rTd5V" });
  });

  it.each([
    { name: "empty identifier", value: { qrId: "" } },
    { name: "leading whitespace", value: { qrId: " XJ_DiM4rTd5V" } },
    { name: "trailing whitespace", value: { qrId: "XJ_DiM4rTd5V " } },
    { name: "whitespace-only identifier", value: { qrId: "   " } },
    { name: "numeric identifier", value: { qrId: 42 } },
    { name: "null identifier", value: { qrId: null } },
    { name: "missing identifier", value: {} },
    { name: "missing input", value: undefined },
  ])("rejects $name", ({ value }) => {
    expect(() => parseAcquiringQrIdentifier(asInput(value), endpoint)).toThrow(
      MonobankValidationError,
    );
  });

  it("reports the calling endpoint without leaking the identifier", () => {
    expect(() =>
      parseAcquiringQrIdentifier(
        { qrId: " secret-qr " },
        "/api/merchant/qr/reset-amount",
      ),
    ).toThrow(
      expect.objectContaining({
        endpoint: "/api/merchant/qr/reset-amount",
        issues: [
          "qrId must be a nonempty string without surrounding whitespace",
        ],
      }),
    );
  });
});
