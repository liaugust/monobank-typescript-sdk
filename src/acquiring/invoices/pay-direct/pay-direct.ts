import * as z from "zod/mini";

import { AcquiringPaymentInitiationKind } from "../../wallet/pay-with-card-token/pay-with-card-token.js";
import type { InvoicePaymentType } from "../models/invoice-payment-info.js";
import { InvoicePaymentType as InvoicePaymentTypeValues } from "../models/invoice-payment-info.js";
import type { MerchantPaymentInfo } from "../models/merchant-payment-info.js";
import { merchantPaymentInfoSchema } from "../models/merchant-payment-info.js";
import { parseInvoiceRequest } from "../shared/request-validation.js";

/** Root-relative endpoint used to charge raw card details. */
export const payInvoiceDirectEndpoint = "/api/merchant/invoice/payment-direct";

/**
 * Raw cardholder details for a direct payment.
 *
 * Handling these values places the calling system in PCI DSS scope. Collect
 * them only on infrastructure certified for cardholder data, never log or
 * persist them, and prefer `acquiring.wallet.pay()` with a stored token, or a
 * hosted invoice from `acquiring.invoices.create()`, wherever possible.
 */
export interface DirectPaymentCardData {
  /** Card verification value. */
  readonly cvv: string;
  /** Card expiry in `mmyy` format. */
  readonly exp: string;
  /** Primary account number. */
  readonly pan: string;
}

/** Input for charging raw card details against a new invoice. */
export interface PayInvoiceDirectInput {
  /** Payment amount in the currency's minor units. */
  readonly amount: number;
  /** Raw cardholder details, which place the caller in PCI DSS scope. */
  readonly cardData: DirectPaymentCardData;
  /** Optional numeric ISO 4217 currency code; Monobank defaults to 980. */
  readonly ccy?: number;
  /** Optional indicator of whether the merchant or the payer initiated the charge. */
  readonly initiationKind?: AcquiringPaymentInitiationKind;
  /** Optional merchant order and fiscalization details. */
  readonly merchantPaymInfo?: MerchantPaymentInfo;
  /** Optional immediate-debit or hold operation type. */
  readonly paymentType?: InvoicePaymentType;
  /** Optional URL Monobank redirects the payer to after payment. */
  readonly redirectUrl?: string;
  /** Optional card-tokenization request. */
  readonly saveCardData?: {
    /** Whether Monobank should tokenize the card after payment. */
    readonly saveCard: boolean;
    /** Optional merchant wallet identifier for the payer. */
    readonly walletId?: string;
  };
  /** Optional callback URL for payment status changes. */
  readonly webHookUrl?: string;
}

const payInvoiceDirectSchema = z.object({
  amount: z.int(),
  cardData: z.object({
    cvv: z.string().check(z.minLength(1)),
    exp: z.string().check(z.minLength(1)),
    pan: z.string().check(z.minLength(1)),
  }),
  ccy: z.optional(z.int()),
  initiationKind: z.optional(z.enum(AcquiringPaymentInitiationKind)),
  merchantPaymInfo: z.optional(merchantPaymentInfoSchema),
  paymentType: z.optional(z.enum(InvoicePaymentTypeValues)),
  redirectUrl: z.optional(z.string()),
  saveCardData: z.optional(
    z.object({
      saveCard: z.boolean(),
      walletId: z.optional(z.string()),
    }),
  ),
  webHookUrl: z.optional(z.string()),
});

type PayInvoiceDirectBody = z.output<typeof payInvoiceDirectSchema>;

/**
 * Validates and builds the direct card-payment body.
 *
 * Validation failures name only the offending field, never its value, so raw
 * card details never reach public error state.
 * @param input Amount, raw card details, and optional payment controls.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When the input does not match the documented request contract.
 */
export function createPayInvoiceDirectBody(
  input: PayInvoiceDirectInput,
): PayInvoiceDirectBody {
  return parseInvoiceRequest(
    payInvoiceDirectSchema,
    input,
    payInvoiceDirectEndpoint,
  );
}
