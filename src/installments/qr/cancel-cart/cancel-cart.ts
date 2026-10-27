import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";
import { invalidInstallmentsRequestMessage } from "../../shared/request-validation.js";

/** Root-relative endpoint cancelling an Installments QR cart. */
export const cancelInstallmentsQrCartEndpoint = "/api/v1/qr/cart/cancel";
const inputSchema = z.object({ qr_id: z.string().check(z.minLength(1)) });
/** Input cancelling a cart on a store-owned QR code. */
export interface CancelInstallmentsQrCartInput {
  /** Nonempty QR identifier belonging to the authenticated store. */
  readonly qr_id: string;
}
/**
 * Validates the QR identifier before Fetch.
 * @param input Store-owned QR identifier.
 * @returns Validated JSON request body.
 * @throws {MonobankValidationError} When the QR identifier is empty or not a string.
 */
export function createCancelInstallmentsQrCartBody(
  input: CancelInstallmentsQrCartInput,
): z.output<typeof inputSchema> {
  return parseMonobankRequest(
    inputSchema,
    input,
    cancelInstallmentsQrCartEndpoint,
    invalidInstallmentsRequestMessage,
  );
}
