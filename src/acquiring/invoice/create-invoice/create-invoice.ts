import * as z from "zod/mini";

import type { RequestOptions } from "../../../shared/request-options.js";
import type { InvoicePaymentType } from "../invoice-payment-info.js";
import { InvoicePaymentType as InvoicePaymentTypeValues } from "../invoice-payment-info.js";
import type { MerchantPaymentInfo } from "../merchant-payment-info.js";
import { merchantPaymentInfoSchema } from "../merchant-payment-info.js";
import { parseInvoiceRequest } from "../request-validation.js";

/** Root-relative endpoint used to create an Acquiring invoice. */
export const createInvoiceEndpoint = "/api/merchant/invoice/create";

const createInvoiceSchema = z.object({
  agentFeePercent: z.optional(z.number()),
  amount: z.int(),
  ccy: z.optional(z.int()),
  code: z.optional(z.string()),
  merchantPaymInfo: z.optional(merchantPaymentInfoSchema),
  paymentType: z.optional(z.enum(InvoicePaymentTypeValues)),
  qrId: z.optional(z.string()),
  redirectUrl: z.optional(z.string()),
  saveCardData: z.optional(
    z.object({
      saveCard: z.boolean(),
      walletId: z.optional(z.string()),
    }),
  ),
  tipsEmployeeId: z.optional(z.string()),
  validity: z.optional(z.int()),
  webHookUrl: z.optional(z.string()),
});

const createInvoiceOptionsSchema = z.object({
  cms: z.optional(z.string().check(z.minLength(1))),
  cmsVersion: z.optional(z.string().check(z.minLength(1))),
});

type CreateInvoiceBody = z.output<typeof createInvoiceSchema>;

/** Input for creating an Acquiring invoice. */
export interface CreateInvoiceInput {
  /** Optional agent commission percentage. */
  readonly agentFeePercent?: number;
  /** Payment amount in the currency's minor units. */
  readonly amount: number;
  /** Optional numeric ISO 4217 currency code; Monobank defaults to 980. */
  readonly ccy?: number;
  /** Optional submerchant terminal code. */
  readonly code?: string;
  /** Optional merchant order and fiscalization details. */
  readonly merchantPaymInfo?: MerchantPaymentInfo;
  /** Optional immediate-debit or hold operation type. */
  readonly paymentType?: InvoicePaymentType;
  /** Optional existing QR cash-register identifier. */
  readonly qrId?: string;
  /** Optional URL to which Monobank redirects the payer. */
  readonly redirectUrl?: string;
  /** Optional card-tokenization request. */
  readonly saveCardData?: {
    /** Whether Monobank should tokenize the card after payment. */
    readonly saveCard: boolean;
    /** Optional merchant wallet identifier for the payer. */
    readonly walletId?: string;
  };
  /** Optional employee identifier eligible to receive tips. */
  readonly tipsEmployeeId?: string;
  /** Optional invoice lifetime in seconds. */
  readonly validity?: number;
  /** Optional callback URL for invoice status changes. */
  readonly webHookUrl?: string;
}

/** Per-request controls and optional CMS attribution for invoice creation. */
export interface CreateInvoiceOptions extends RequestOptions {
  /** Optional CMS or e-commerce platform name sent as `X-Cms`. */
  readonly cms?: string;
  /** Optional CMS or integration version sent as `X-Cms-Version`. */
  readonly cmsVersion?: string;
}

/** Runtime validator for `POST /api/merchant/invoice/create` responses. */
export const newInvoiceSchema = z.looseObject({
  invoiceId: z.string(),
  pageUrl: z.string(),
});

/** Newly created invoice identifier and hosted payment-page URL. */
export type NewInvoice = z.infer<typeof newInvoiceSchema>;

/**
 * Validates and builds a create-invoice JSON body.
 * @param input Invoice creation parameters.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When a documented field has an invalid shape.
 */
export function createInvoiceBody(
  input: CreateInvoiceInput,
): CreateInvoiceBody {
  return parseInvoiceRequest(createInvoiceSchema, input, createInvoiceEndpoint);
}

/**
 * Validates and builds optional CMS attribution headers.
 * @param options Invoice request controls and CMS attribution.
 * @returns Header values accepted by the create-invoice endpoint.
 * @throws {MonobankValidationError} When a supplied CMS value is empty.
 */
export function createInvoiceHeaders(
  options: CreateInvoiceOptions | undefined,
): Readonly<Record<string, string>> {
  const parsed = parseInvoiceRequest(
    createInvoiceOptionsSchema,
    options ?? {},
    createInvoiceEndpoint,
  );

  return {
    ...(parsed.cms === undefined ? {} : { "X-Cms": parsed.cms }),
    ...(parsed.cmsVersion === undefined
      ? {}
      : { "X-Cms-Version": parsed.cmsVersion }),
  };
}
