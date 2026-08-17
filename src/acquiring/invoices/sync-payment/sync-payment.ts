import * as z from "zod/mini";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { parseInvoiceRequest } from "../shared/request-validation.js";

/** Root-relative endpoint used to settle a payment synchronously. */
export const syncInvoicePaymentEndpoint = "/api/merchant/invoice/sync-payment";

/** Importable values accepted by synchronous-payment `cardData.type` fields. */
export const SyncPaymentPanType = {
  Dpan: "DPAN",
  Fpan: "FPAN",
} as const;

/** Whether a synchronous payment carries a funding or device account number. */
export type SyncPaymentPanType =
  (typeof SyncPaymentPanType)[keyof typeof SyncPaymentPanType];

/**
 * Card and 3-D Secure authentication values for a synchronous payment.
 *
 * Handling these values places the calling system in PCI DSS scope. Collect
 * them only on infrastructure certified for cardholder data, and never log or
 * persist them.
 */
export interface SyncPaymentCardData {
  /** Optional cardholder authentication verification value. */
  readonly cavv?: string;
  /** Optional card verification value. */
  readonly cvv?: string;
  /** Optional directory server transaction identifier. */
  readonly dsTranId?: string;
  /** Electronic commerce indicator carrying the authentication result. */
  readonly eciIndicator: string;
  /** Card expiry in `mmyy` format. */
  readonly exp: string;
  /** Optional merchant-initiated transaction indicator. */
  readonly mit?: string;
  /** Funding or device primary account number. */
  readonly pan: string;
  /** Optional subsequent-transaction indicator. */
  readonly sst?: number;
  /** Optional token authentication verification value. */
  readonly tavv?: string;
  /** Optional trace identifier of the first operation. */
  readonly tid?: string;
  /** Optional token requestor identifier. */
  readonly tReqID?: string;
  /** Whether `pan` is a funding or device account number. */
  readonly type: SyncPaymentPanType;
}

/** Decrypted wallet crypto-container values for a synchronous payment. */
export interface SyncPaymentWalletContainer {
  /** Optional TAVV cryptogram. */
  readonly cryptogram?: string;
  /** Electronic commerce indicator carrying the authentication result. */
  readonly eciIndicator: string;
  /** Card expiry in `mmyy` format. */
  readonly exp: string;
  /** Tokenized card number from the wallet container. */
  readonly token: string;
}

/** Merchant order details attached to a synchronous payment. */
export interface SyncPaymentMerchantInfo {
  /** Optional payment destination shown to the payer. */
  readonly destination?: string;
  /** Optional merchant order or receipt reference. */
  readonly reference?: string;
}

/** Input for settling one payment synchronously. */
export interface SyncInvoicePaymentInput {
  /** Payment amount in the currency's minor units. */
  readonly amount: number;
  /** Optional decrypted Apple Pay container. */
  readonly applePay?: SyncPaymentWalletContainer;
  /** Optional raw card and 3-D Secure authentication values. */
  readonly cardData?: SyncPaymentCardData;
  /** Numeric ISO 4217 currency code. */
  readonly ccy: number;
  /** Optional decrypted Google Pay container. */
  readonly googlePay?: SyncPaymentWalletContainer;
  /** Optional merchant order details. */
  readonly merchantPaymInfo?: SyncPaymentMerchantInfo;
}

const syncPaymentWalletContainerSchema = z.object({
  cryptogram: z.optional(z.string()),
  eciIndicator: z.string().check(z.minLength(1)),
  exp: z.string().check(z.minLength(1)),
  token: z.string().check(z.minLength(1)),
});

const syncInvoicePaymentSchema = z.object({
  amount: z.int(),
  applePay: z.optional(syncPaymentWalletContainerSchema),
  cardData: z.optional(
    z.object({
      cavv: z.optional(z.string()),
      cvv: z.optional(z.string()),
      dsTranId: z.optional(z.string()),
      eciIndicator: z.string().check(z.minLength(1)),
      exp: z.string().check(z.minLength(1)),
      mit: z.optional(z.string()),
      pan: z.string().check(z.minLength(1)),
      sst: z.optional(z.number()),
      tavv: z.optional(z.string()),
      tid: z.optional(z.string()),
      tReqID: z.optional(z.string()),
      type: z.enum(SyncPaymentPanType),
    }),
  ),
  ccy: z.int(),
  googlePay: z.optional(syncPaymentWalletContainerSchema),
  merchantPaymInfo: z.optional(
    z.object({
      destination: z.optional(z.string()),
      reference: z.optional(z.string()),
    }),
  ),
});

type SyncInvoicePaymentBody = z.output<typeof syncInvoicePaymentSchema>;

/**
 * Validates and builds the synchronous-payment body.
 *
 * Validation failures name only the offending field, never its value, so card
 * and cryptogram material never reaches public error state.
 * @param input Amount, currency, and exactly one payment container.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When the input does not match the documented request contract, or does not carry exactly one payment container.
 */
export function createSyncInvoicePaymentBody(
  input: SyncInvoicePaymentInput,
): SyncInvoicePaymentBody {
  const parsed = parseInvoiceRequest(
    syncInvoicePaymentSchema,
    input,
    syncInvoicePaymentEndpoint,
  );
  const containers = [parsed.applePay, parsed.cardData, parsed.googlePay];

  if (containers.filter((container) => container !== undefined).length !== 1) {
    throw new MonobankValidationError({
      endpoint: syncInvoicePaymentEndpoint,
      issues: [
        "exactly one of applePay, cardData, or googlePay must be supplied",
      ],
      message: "Invalid Acquiring invoice request.",
    });
  }

  return parsed;
}
