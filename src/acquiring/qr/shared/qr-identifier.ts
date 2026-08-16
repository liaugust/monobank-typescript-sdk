import * as z from "zod/mini";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";

/** Input identifying the activated QR cashier whose details should be loaded. */
export interface GetAcquiringQrDetailsInput {
  /** QR cashier identifier returned by `acquiring.qr.list()`. */
  readonly qrId: string;
}

/** Input identifying the QR cashier whose payment amount should be cleared. */
export type ResetAcquiringQrAmountInput = GetAcquiringQrDetailsInput;

const qrIdentifierSchema = z.object({
  qrId: z
    .string()
    .check(z.refine((value) => value.length > 0 && value.trim() === value)),
});

/**
 * Parses an Acquiring QR cashier identifier ahead of Fetch.
 *
 * The thrown error carries only the endpoint and a fixed issue string so the
 * rejected identifier is never retained in public error state.
 * @param input Untrusted method input.
 * @param endpoint Endpoint receiving the validated identifier.
 * @returns Validated QR cashier identifier.
 * @throws {MonobankValidationError} When `qrId` is not a nonempty string without surrounding whitespace.
 */
export function parseAcquiringQrIdentifier(
  input: GetAcquiringQrDetailsInput,
  endpoint: string,
): GetAcquiringQrDetailsInput {
  const parsed = qrIdentifierSchema.safeParse(input);

  if (!parsed.success) {
    throw new MonobankValidationError({
      endpoint,
      issues: ["qrId must be a nonempty string without surrounding whitespace"],
      message: "Invalid Acquiring QR request.",
    });
  }

  return parsed.data;
}
