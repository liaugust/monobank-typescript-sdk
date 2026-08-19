import * as z from "zod/mini";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";

const acquiringT2pPaymentStatusEndpoint =
  "/api/merchant/t2p/terminal/payment/external/status";

/** Input identifying the tap-to-phone payment to look up. */
export interface GetAcquiringT2pPaymentStatusInput {
  /** Identifier the integrator sent as `id` when creating the payment. */
  readonly externalPaymentId: string;
}

const acquiringT2pPaymentStatusSchema = z.object({
  externalPaymentId: z
    .string()
    .check(z.refine((value) => value.length > 0 && value.trim() === value)),
});

/**
 * Builds the encoded tap-to-phone payment-status endpoint.
 *
 * The thrown error carries only the endpoint and a fixed issue string, so a
 * rejected identifier is never retained in public error state.
 * @param input Integrator's external payment identifier.
 * @returns Root-relative status endpoint with an encoded query parameter.
 * @throws {MonobankValidationError} When `externalPaymentId` is not a nonempty string without surrounding whitespace.
 */
export function createAcquiringT2pPaymentStatusEndpoint(
  input: GetAcquiringT2pPaymentStatusInput,
): string {
  const parsed = acquiringT2pPaymentStatusSchema.safeParse(input);

  if (!parsed.success) {
    throw new MonobankValidationError({
      endpoint: acquiringT2pPaymentStatusEndpoint,
      issues: [
        "externalPaymentId must be a nonempty string without surrounding whitespace",
      ],
      message: "Invalid Acquiring tap-to-phone request.",
    });
  }

  const search = new URLSearchParams({
    externalPaymentId: parsed.data.externalPaymentId,
  });

  return `${acquiringT2pPaymentStatusEndpoint}?${search.toString()}`;
}
