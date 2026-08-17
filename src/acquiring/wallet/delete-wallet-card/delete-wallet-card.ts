import * as z from "zod/mini";

import { parseAcquiringRequest } from "../../shared/request-validation.js";

/** Input identifying the tokenized card to remove from a merchant wallet. */
export interface DeleteAcquiringWalletCardInput {
  /** Card token returned by `acquiring.wallet.list()`. */
  readonly cardToken: string;
}

const deleteAcquiringWalletCardEndpoint = "/api/merchant/wallet/card";

const deleteAcquiringWalletCardSchema = z.object({
  cardToken: z.string().check(z.minLength(1)),
});

/**
 * Builds the encoded wallet card-removal endpoint.
 * @param input Card token to remove.
 * @returns Root-relative endpoint with an encoded `cardToken` query parameter.
 * @throws {MonobankValidationError} When `cardToken` is missing or empty.
 */
export function createDeleteAcquiringWalletCardEndpoint(
  input: DeleteAcquiringWalletCardInput,
): string {
  const parsed = parseAcquiringRequest(
    deleteAcquiringWalletCardSchema,
    input,
    deleteAcquiringWalletCardEndpoint,
    "Invalid Acquiring wallet request.",
  );
  const search = new URLSearchParams({ cardToken: parsed.cardToken });

  return `${deleteAcquiringWalletCardEndpoint}?${search.toString()}`;
}
