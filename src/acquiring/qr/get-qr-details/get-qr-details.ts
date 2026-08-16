import type { GetAcquiringQrDetailsInput } from "../shared/qr-identifier.js";
import { parseAcquiringQrIdentifier } from "../shared/qr-identifier.js";

const acquiringQrDetailsEndpoint = "/api/merchant/qr/details";

/**
 * Builds the encoded Acquiring QR details endpoint.
 * @param input QR cashier identifier.
 * @returns Root-relative QR details endpoint with an encoded `qrId` query parameter.
 * @throws {MonobankValidationError} When `qrId` is not a nonempty string without surrounding whitespace.
 */
export function createAcquiringQrDetailsEndpoint(
  input: GetAcquiringQrDetailsInput,
): string {
  const parsed = parseAcquiringQrIdentifier(input, acquiringQrDetailsEndpoint);
  const search = new URLSearchParams({ qrId: parsed.qrId });

  return `${acquiringQrDetailsEndpoint}?${search.toString()}`;
}

export type { GetAcquiringQrDetailsInput } from "../shared/qr-identifier.js";
