import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Input selecting which merchant wallet to read. */
export interface ListAcquiringWalletCardsInput {
  /** Merchant-assigned wallet identifier for one payer. */
  readonly walletId: string;
}

const listAcquiringWalletCardsEndpoint = "/api/merchant/wallet";

const listAcquiringWalletCardsSchema = z.object({
  walletId: z.string().check(z.minLength(1)),
});

/**
 * Builds the encoded merchant wallet endpoint.
 * @param input Wallet identifier.
 * @returns Root-relative wallet endpoint with an encoded `walletId` query parameter.
 * @throws {MonobankValidationError} When `walletId` is missing or empty.
 */
export function createAcquiringWalletEndpoint(
  input: ListAcquiringWalletCardsInput,
): string {
  const parsed = parseMonobankRequest(
    listAcquiringWalletCardsSchema,
    input,
    listAcquiringWalletCardsEndpoint,
    "Invalid Acquiring wallet request.",
  );
  const search = new URLSearchParams({ walletId: parsed.walletId });

  return `${listAcquiringWalletCardsEndpoint}?${search.toString()}`;
}
