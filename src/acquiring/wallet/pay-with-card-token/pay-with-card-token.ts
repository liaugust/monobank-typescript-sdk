import * as z from "zod/mini";

import { parseAcquiringRequest } from "../../shared/request-validation.js";

/** Root-relative endpoint used to charge a stored card token. */
export const payWithCardTokenEndpoint = "/api/merchant/wallet/payment";

/** Importable values accepted by Acquiring `initiationKind` fields. */
export const AcquiringPaymentInitiationKind = {
  Client: "client",
  Merchant: "merchant",
} as const;

/** Who initiated a tokenized card payment. */
export type AcquiringPaymentInitiationKind =
  (typeof AcquiringPaymentInitiationKind)[keyof typeof AcquiringPaymentInitiationKind];

/** Input for charging a card token stored in a merchant wallet. */
export interface PayWithCardTokenInput {
  /** Payment amount in the currency's minor units. */
  readonly amount: number;
  /** Stored card token to charge. */
  readonly cardToken: string;
  /** Numeric ISO 4217 currency code. */
  readonly ccy: number;
  /** Whether the merchant or the payer initiated this charge. */
  readonly initiationKind: AcquiringPaymentInitiationKind;
  /** Optional URL Monobank redirects the payer to after 3-D Secure. */
  readonly redirectUrl?: string;
  /** Optional callback URL for payment status changes. */
  readonly webHookUrl?: string;
}

const payWithCardTokenSchema = z.object({
  amount: z.int(),
  cardToken: z.string().check(z.minLength(1)),
  ccy: z.int(),
  initiationKind: z.enum(AcquiringPaymentInitiationKind),
  redirectUrl: z.optional(z.string()),
  webHookUrl: z.optional(z.string()),
});

type PayWithCardTokenBody = z.output<typeof payWithCardTokenSchema>;

/**
 * Validates and builds the tokenized card-payment body.
 * @param input Card token, amount, currency, and initiation controls.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When the input does not match the documented request contract.
 */
export function createPayWithCardTokenBody(
  input: PayWithCardTokenInput,
): PayWithCardTokenBody {
  return parseAcquiringRequest(
    payWithCardTokenSchema,
    input,
    payWithCardTokenEndpoint,
    "Invalid Acquiring wallet request.",
  );
}
