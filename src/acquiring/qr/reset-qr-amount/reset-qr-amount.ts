import type { ResetAcquiringQrAmountInput } from "../shared/qr-identifier.js";
import { parseAcquiringQrIdentifier } from "../shared/qr-identifier.js";

/** Root-relative endpoint used to clear the amount set on an Acquiring QR cashier. */
export const resetAcquiringQrAmountEndpoint = "/api/merchant/qr/reset-amount";

interface ResetAcquiringQrAmountBody {
  readonly qrId: string;
}

/**
 * Validates and builds the QR amount-reset JSON body.
 * @param input QR cashier identifier.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When `qrId` is not a nonempty string without surrounding whitespace.
 */
export function createResetAcquiringQrAmountBody(
  input: ResetAcquiringQrAmountInput,
): ResetAcquiringQrAmountBody {
  return parseAcquiringQrIdentifier(input, resetAcquiringQrAmountEndpoint);
}

export type { ResetAcquiringQrAmountInput } from "../shared/qr-identifier.js";
