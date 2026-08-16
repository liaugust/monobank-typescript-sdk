import * as z from "zod/mini";

import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import type { RequestOptions } from "../shared/request-options.js";
import type { ResponseSchema } from "../transport/response-schema.js";
import { DiscountMode, DiscountType, InvoicePaymentType } from "./invoice.js";

const createEndpoint = "/api/merchant/invoice/create";
const statusEndpoint = "/api/merchant/invoice/status";
const cancelEndpoint = "/api/merchant/invoice/cancel";
const removeEndpoint = "/api/merchant/invoice/remove";
const finalizeEndpoint = "/api/merchant/invoice/finalize";
const receiptEndpoint = "/api/merchant/invoice/receipt";
const fiscalChecksEndpoint = "/api/merchant/invoice/fiscal-checks";
const requiredStringSchema = z.string().check(z.minLength(1));
const discountValueSchema = z
  .number()
  .check(z.minimum(0.01), z.multipleOf(0.01));

const discountSchema = z.object({
  mode: z.enum(DiscountMode),
  type: z.enum(DiscountType),
  value: discountValueSchema,
});

const fiscalizationItemShape = {
  barcode: z.optional(z.string()),
  code: requiredStringSchema,
  footer: z.optional(z.string()),
  header: z.optional(z.string()),
  name: requiredStringSchema,
  qty: z.number(),
  sum: z.int(),
  tax: z.optional(z.array(z.int())),
  uktzed: z.optional(z.string()),
};

const fiscalizationItemSchema = z.object(fiscalizationItemShape);

const invoiceBasketItemSchema = z.object({
  ...fiscalizationItemShape,
  discounts: z.optional(z.array(discountSchema)),
  icon: z.optional(z.string()),
  total: z.optional(z.int()),
  unit: z.optional(z.string()),
});

const merchantPaymentInfoSchema = z.object({
  basketOrder: z.optional(z.array(invoiceBasketItemSchema)),
  comment: z.optional(z.string().check(z.maxLength(280))),
  customerEmails: z.optional(
    z
      .array(z.string())
      .check(
        z.refine(
          (emails) => new Set(emails).size === emails.length,
          "customerEmails must contain unique values",
        ),
      ),
  ),
  destination: z.optional(z.string().check(z.maxLength(280))),
  discounts: z.optional(z.array(discountSchema)),
  reference: z.optional(z.string()),
});

const createInvoiceSchema = z.object({
  agentFeePercent: z.optional(z.number()),
  amount: z.int(),
  ccy: z.optional(z.int()),
  code: z.optional(z.string()),
  merchantPaymInfo: z.optional(merchantPaymentInfoSchema),
  paymentType: z.optional(z.enum(InvoicePaymentType)),
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

const invoiceIdentifierSchema = z.object({
  invoiceId: requiredStringSchema,
});

const cancelInvoiceSchema = z.object({
  amount: z.optional(z.int()),
  extRef: z.optional(z.string()),
  invoiceId: requiredStringSchema,
  items: z.optional(z.array(fiscalizationItemSchema)),
});

const finalizeInvoiceSchema = z.object({
  amount: z.optional(z.int()),
  invoiceId: requiredStringSchema,
  items: z.optional(z.array(fiscalizationItemSchema)),
});

const receiptQuerySchema = z.object({
  email: z.optional(z.string()),
  invoiceId: requiredStringSchema,
});

const createInvoiceOptionsSchema = z.object({
  cms: z.optional(requiredStringSchema),
  cmsVersion: z.optional(requiredStringSchema),
});

type CreateInvoiceBody = z.output<typeof createInvoiceSchema>;
type CancelInvoiceBody = z.output<typeof cancelInvoiceSchema>;
type RemoveInvoiceBody = z.output<typeof invoiceIdentifierSchema>;
type FinalizeInvoiceBody = z.output<typeof finalizeInvoiceSchema>;

/** A discount or surcharge applied to an invoice or basket item. */
export interface InvoiceDiscount {
  /** Whether the adjustment is percentage-based or an absolute value. */
  readonly mode: DiscountMode;
  /** Whether the adjustment is a discount or surcharge. */
  readonly type: DiscountType;
  /** Adjustment value, with at most two decimal places and a minimum of 0.01. */
  readonly value: number;
}

/** Item data used to fiscalize an invoice cancellation or hold finalization. */
export interface FiscalizationItem {
  /** Optional product barcode. */
  readonly barcode?: string;
  /** Merchant product code required by Monobank. */
  readonly code: string;
  /** Optional text printed after the item name. */
  readonly footer?: string;
  /** Optional text printed before the item name. */
  readonly header?: string;
  /** Product or service name. */
  readonly name: string;
  /** Item quantity. */
  readonly qty: number;
  /** Per-item amount in the currency's minor units. */
  readonly sum: number;
  /** Optional fiscal tax-rate identifiers. */
  readonly tax?: readonly number[];
  /** Optional Ukrainian product-classification code. */
  readonly uktzed?: string;
}

/** Basket item displayed on an invoice and optionally sent for fiscalization. */
export interface InvoiceBasketItem extends FiscalizationItem {
  /** Optional adjustments applied to this basket item. */
  readonly discounts?: readonly InvoiceDiscount[];
  /** Optional product image URL. */
  readonly icon?: string;
  /** Optional total amount for all item units in minor units. */
  readonly total?: number;
  /** Optional unit-of-measure label. */
  readonly unit?: string;
}

/** Merchant-defined order details attached to a new invoice. */
export interface MerchantPaymentInfo {
  /** Optional itemized order contents. */
  readonly basketOrder?: readonly InvoiceBasketItem[];
  /** Optional internal comment, limited to 280 characters. */
  readonly comment?: string;
  /** Optional recipients for a fiscal receipt. */
  readonly customerEmails?: readonly string[];
  /** Optional payment purpose, limited to 280 characters. */
  readonly destination?: string;
  /** Optional order-wide adjustments. */
  readonly discounts?: readonly InvoiceDiscount[];
  /** Optional merchant order or receipt reference. */
  readonly reference?: string;
}

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

/** Input identifying an invoice status request. */
export interface GetInvoiceStatusInput {
  /** Monobank invoice identifier. */
  readonly invoiceId: string;
}

/** Input for cancelling all or part of a successful invoice payment. */
export interface CancelInvoiceInput extends GetInvoiceStatusInput {
  /** Optional partial cancellation amount in minor units. */
  readonly amount?: number;
  /** Optional merchant-defined cancellation reference. */
  readonly extRef?: string;
  /** Optional items used to fiscalize the return. */
  readonly items?: readonly FiscalizationItem[];
}

/** Input identifying an unpaid invoice to invalidate. */
export type RemoveInvoiceInput = GetInvoiceStatusInput;

/** Input for finalizing all or part of a held invoice amount. */
export interface FinalizeInvoiceInput extends GetInvoiceStatusInput {
  /** Optional amount to capture in minor units. */
  readonly amount?: number;
  /** Optional items used when fiscalizing a changed capture amount. */
  readonly items?: readonly FiscalizationItem[];
}

/** Input for retrieving or emailing an invoice receipt. */
export interface GetInvoiceReceiptInput extends GetInvoiceStatusInput {
  /** Optional email address to which Monobank should send the receipt. */
  readonly email?: string;
}

/** Input identifying an invoice whose fiscal checks should be loaded. */
export type GetInvoiceFiscalChecksInput = GetInvoiceStatusInput;

/**
 * Validates and builds a create-invoice JSON body.
 * @param input Invoice creation parameters.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When a documented field has an invalid shape.
 */
export function createInvoiceBody(
  input: CreateInvoiceInput,
): CreateInvoiceBody {
  return parseRequest(createInvoiceSchema, input, createEndpoint);
}

/**
 * Validates and builds optional CMS attribution headers.
 * @param options Invoice request controls and CMS attribution.
 * @returns Header values accepted by the Acquiring create-invoice endpoint.
 * @throws {MonobankValidationError} When a supplied CMS value is empty.
 */
export function createInvoiceHeaders(
  options: CreateInvoiceOptions | undefined,
): Readonly<Record<string, string>> {
  const parsed = parseRequest(
    createInvoiceOptionsSchema,
    options ?? {},
    createEndpoint,
  );

  return {
    ...(parsed.cms === undefined ? {} : { "X-Cms": parsed.cms }),
    ...(parsed.cmsVersion === undefined
      ? {}
      : { "X-Cms-Version": parsed.cmsVersion }),
  };
}

/**
 * Builds the encoded invoice-status endpoint.
 * @param input Invoice identifier.
 * @returns Root-relative endpoint with an encoded query string.
 * @throws {MonobankValidationError} When `invoiceId` is empty.
 */
export function createInvoiceStatusEndpoint(
  input: GetInvoiceStatusInput,
): string {
  return createInvoiceQueryEndpoint(statusEndpoint, input);
}

/**
 * Validates and builds a cancellation JSON body.
 * @param input Cancellation parameters.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When a documented field has an invalid shape.
 */
export function createCancelInvoiceBody(
  input: CancelInvoiceInput,
): CancelInvoiceBody {
  return parseRequest(cancelInvoiceSchema, input, cancelEndpoint);
}

/**
 * Validates and builds an invoice-removal JSON body.
 * @param input Invoice identifier.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When `invoiceId` is empty.
 */
export function createRemoveInvoiceBody(
  input: RemoveInvoiceInput,
): RemoveInvoiceBody {
  return parseRequest(invoiceIdentifierSchema, input, removeEndpoint);
}

/**
 * Validates and builds a hold-finalization JSON body.
 * @param input Hold finalization parameters.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When a documented field has an invalid shape.
 */
export function createFinalizeInvoiceBody(
  input: FinalizeInvoiceInput,
): FinalizeInvoiceBody {
  return parseRequest(finalizeInvoiceSchema, input, finalizeEndpoint);
}

/**
 * Builds the encoded receipt endpoint.
 * @param input Invoice identifier and optional delivery email.
 * @returns Root-relative endpoint with encoded query parameters.
 * @throws {MonobankValidationError} When `invoiceId` is empty.
 */
export function createInvoiceReceiptEndpoint(
  input: GetInvoiceReceiptInput,
): string {
  const parsed = parseRequest(receiptQuerySchema, input, receiptEndpoint);
  const parameters = new URLSearchParams({ invoiceId: parsed.invoiceId });

  if (parsed.email !== undefined) {
    parameters.set("email", parsed.email);
  }

  return `${receiptEndpoint}?${parameters.toString()}`;
}

/**
 * Builds the encoded fiscal-checks endpoint.
 * @param input Invoice identifier.
 * @returns Root-relative endpoint with an encoded query string.
 * @throws {MonobankValidationError} When `invoiceId` is empty.
 */
export function createInvoiceFiscalChecksEndpoint(
  input: GetInvoiceFiscalChecksInput,
): string {
  return createInvoiceQueryEndpoint(fiscalChecksEndpoint, input);
}

function createInvoiceQueryEndpoint(
  endpoint: string,
  input: GetInvoiceStatusInput,
): string {
  const parsed = parseRequest(invoiceIdentifierSchema, input, endpoint);
  const parameters = new URLSearchParams({ invoiceId: parsed.invoiceId });

  return `${endpoint}?${parameters.toString()}`;
}

function parseRequest<T>(
  schema: ResponseSchema<T>,
  input: unknown,
  endpoint: string,
): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new MonobankValidationError({
      endpoint,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
      message: "Invalid Acquiring invoice request.",
    });
  }

  return parsed.data;
}
