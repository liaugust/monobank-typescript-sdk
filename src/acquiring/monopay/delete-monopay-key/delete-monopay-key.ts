import * as z from "zod/mini";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";

/** Root-relative endpoint deleting a monopay button signing key. */
export const deleteMonopaySigningKeyEndpoint =
  "/api/merchant/monopay/pubkey-delete";

/** Input identifying the monopay signing key to delete. */
export interface DeleteMonopaySigningKeyInput {
  /** Key identifier returned by `acquiring.monopay.listKeys()`. */
  readonly keyId: string;
}

const deleteMonopaySigningKeySchema = z.object({
  keyId: z
    .string()
    .check(z.refine((value) => value.length > 0 && value.trim() === value)),
});

/**
 * Validates and builds the monopay key-deletion JSON body.
 * @param input Key identifier.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When `keyId` is not a nonempty string without surrounding whitespace.
 */
export function createDeleteMonopaySigningKeyBody(
  input: DeleteMonopaySigningKeyInput,
): DeleteMonopaySigningKeyInput {
  const parsed = deleteMonopaySigningKeySchema.safeParse(input);

  if (!parsed.success) {
    throw new MonobankValidationError({
      endpoint: deleteMonopaySigningKeyEndpoint,
      issues: [
        "keyId must be a nonempty string without surrounding whitespace",
      ],
      message: "Invalid monopay signing-key request.",
    });
  }

  return parsed.data;
}
