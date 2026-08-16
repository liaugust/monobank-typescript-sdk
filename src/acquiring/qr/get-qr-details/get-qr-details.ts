import * as z from "zod/mini";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";

/** Input identifying the activated QR cashier whose details should be loaded. */
export interface GetAcquiringQrDetailsInput {
  /** QR cashier identifier returned by `acquiring.qr.list()`. */
  readonly qrId: string;
}

const acquiringQrDetailsEndpoint = "/api/merchant/qr/details";

const qrIdentifierSchema = z.object({
  qrId: z
    .string()
    .check(z.refine((value) => value.length > 0 && value.trim() === value)),
});

/**
 * Builds the encoded Acquiring QR details endpoint.
 * @param input QR cashier identifier.
 * @returns Root-relative QR details endpoint with an encoded `qrId` query parameter.
 * @throws {MonobankValidationError} When `qrId` is not a nonempty string without surrounding whitespace.
 */
export function createAcquiringQrDetailsEndpoint(
  input: GetAcquiringQrDetailsInput,
): string {
  const parsed = qrIdentifierSchema.safeParse(input);

  if (!parsed.success) {
    throw new MonobankValidationError({
      endpoint: acquiringQrDetailsEndpoint,
      issues: ["qrId must be a nonempty string without surrounding whitespace"],
      message: "Invalid Acquiring QR request.",
    });
  }

  const search = new URLSearchParams({ qrId: parsed.data.qrId });

  return `${acquiringQrDetailsEndpoint}?${search.toString()}`;
}
