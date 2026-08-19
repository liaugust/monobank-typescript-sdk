import * as z from "zod/mini";

import type { RequestOptions } from "../../../shared/request-options.js";
import type { InvoiceDisplayType } from "../models/invoice-display-type.js";
import { InvoiceDisplayType as InvoiceDisplayTypeValues } from "../models/invoice-display-type.js";
import type { InvoicePaymentType } from "../models/invoice-payment-info.js";
import { InvoicePaymentType as InvoicePaymentTypeValues } from "../models/invoice-payment-info.js";
import type { MerchantPaymentInfo } from "../models/merchant-payment-info.js";
import { merchantPaymentInfoSchema } from "../models/merchant-payment-info.js";
import { parseInvoiceRequest } from "../shared/request-validation.js";

/** Root-relative endpoint used to create an Acquiring invoice. */
export const createInvoiceEndpoint = "/api/merchant/invoice/create";

const createInvoiceSchema = z
  .object({
    agentFeePercent: z.optional(z.number()),
    amount: z.int(),
    ccy: z.optional(z.int()),
    code: z.optional(z.string()),
    displayType: z.optional(z.enum(InvoiceDisplayTypeValues)),
    failUrl: z.optional(z.string()),
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
    successUrl: z.optional(z.string()),
    tipsEmployeeId: z.optional(z.string()),
    validity: z.optional(z.int()),
    webHookUrl: z.optional(z.string()),
    withAppUrl: z.optional(z.boolean()),
  })
  .check(
    z.refine(
      (value) =>
        value.paymentType !== InvoicePaymentTypeValues.Verification ||
        (value.amount === 0 && value.saveCardData?.saveCard === true),
      "a verification paymentType requires amount 0 and saveCardData.saveCard true",
    ),
  );

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
  /**
   * Optional widget mode returning an iframe link instead of a plain page URL.
   *
   * `InvoiceDisplayType.Iframe` is the only documented value.
   */
  readonly displayType?: InvoiceDisplayType;
  /**
   * Optional URL Monobank redirects the payer to after a failed payment.
   *
   * Monobank documents this redirect as disabled by default; a merchant has to
   * ask support to enable it before the value has any effect.
   */
  readonly failUrl?: string;
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
  /**
   * Optional URL Monobank redirects the payer to after a successful payment.
   *
   * Monobank documents this redirect as disabled by default; a merchant has to
   * ask support to enable it before the value has any effect.
   */
  readonly successUrl?: string;
  /** Optional employee identifier eligible to receive tips. */
  readonly tipsEmployeeId?: string;
  /** Optional invoice lifetime in seconds. */
  readonly validity?: number;
  /** Optional callback URL for invoice status changes. */
  readonly webHookUrl?: string;
  /**
   * Optional request for a `monobank://` deeplink on the created invoice.
   *
   * Sending `true` adds `appUrl` to the response. Monobank documents it as
   * unsupported for QR and verification payments, which is stated rather than
   * rejected here because the documentation does not say the request fails.
   */
  readonly withAppUrl?: boolean;
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
  appUrl: z.optional(z.string()),
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
