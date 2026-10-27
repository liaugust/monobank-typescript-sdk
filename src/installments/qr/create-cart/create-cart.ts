import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";
import { invalidInstallmentsRequestMessage } from "../../shared/request-validation.js";

/** Root-relative endpoint creating an Installments QR cart. */
export const createInstallmentsQrCartEndpoint = "/api/v1/qr/cart";
const inputSchema = z.object({
  qr_id: z.string().check(z.minLength(1)),
  store_order_id: z.uuid(),
  products: z
    .array(
      z.object({
        name: z.string().check(z.minLength(1), z.maxLength(500)),
        count: z.int().check(z.minimum(1)),
        sum: z.number().check(z.minimum(0.01)),
      }),
    )
    .check(z.minLength(1)),
  result_callback: z.url({ protocol: /^https?$/ }),
});
/** One product in an Installments QR cart. */
export interface InstallmentsQrCartProduct {
  /** Product name, between 1 and 500 characters. */
  readonly name: string;
  /** Positive integer quantity. */
  readonly count: number;
  /** Price per unit in hryvnia, at least 0.01; never multiply by 100. */
  readonly sum: number;
}
/** Input creating a cart on a QR code owned by the authenticated store. */
export interface CreateInstallmentsQrCartInput {
  /** Nonempty QR identifier belonging to this store. */
  readonly qr_id: string;
  /** Store's UUID order identifier. */
  readonly store_order_id: string;
  /** At least one product, with prices in hryvnia. */
  readonly products: readonly InstallmentsQrCartProduct[];
  /** HTTP or HTTPS callback URL for operation status. */
  readonly result_callback: string;
}
/**
 * Validates a QR cart before transmission without changing its wire units.
 * @param input Store QR identifier, order, products, and callback.
 * @returns Validated JSON request body.
 * @throws {MonobankValidationError} When required fields, UUID, URL, or product values are invalid.
 */
export function createInstallmentsQrCartBody(
  input: CreateInstallmentsQrCartInput,
): z.output<typeof inputSchema> {
  return parseMonobankRequest(
    inputSchema,
    input,
    createInstallmentsQrCartEndpoint,
    invalidInstallmentsRequestMessage,
  );
}
