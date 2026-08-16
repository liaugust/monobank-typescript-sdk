import * as z from "zod/mini";

/** Importable values accepted by an invoice `paymentType` field. */
export const InvoicePaymentType = {
  Debit: "debit",
  Hold: "hold",
} as const;

/** A documented Acquiring invoice payment type. */
export type InvoicePaymentType =
  (typeof InvoicePaymentType)[keyof typeof InvoicePaymentType];

/** Importable values returned by an invoice `status` field. */
export const InvoiceStatus = {
  Created: "created",
  Expired: "expired",
  Failure: "failure",
  Hold: "hold",
  Processing: "processing",
  Reversed: "reversed",
  Success: "success",
} as const;

/** A documented Acquiring invoice status. */
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

/** Importable values returned by cancellation `status` fields. */
export const InvoiceCancellationStatus = {
  Failure: "failure",
  Processing: "processing",
  Success: "success",
} as const;

/** A documented Acquiring cancellation status. */
export type InvoiceCancellationStatus =
  (typeof InvoiceCancellationStatus)[keyof typeof InvoiceCancellationStatus];

/** Importable values returned by invoice `paymentSystem` fields. */
export const InvoicePaymentSystem = {
  Mastercard: "mastercard",
  Visa: "visa",
} as const;

/** A documented payment system for an Acquiring invoice. */
export type InvoicePaymentSystem =
  (typeof InvoicePaymentSystem)[keyof typeof InvoicePaymentSystem];

/** Importable values returned by invoice `paymentMethod` fields. */
export const InvoicePaymentMethod = {
  Apple: "apple",
  Direct: "direct",
  Google: "google",
  Monobank: "monobank",
  Pan: "pan",
  Wallet: "wallet",
} as const;

/** A documented payment method for an Acquiring invoice. */
export type InvoicePaymentMethod =
  (typeof InvoicePaymentMethod)[keyof typeof InvoicePaymentMethod];

/** Importable values returned by tokenized-card `status` fields. */
export const InvoiceWalletStatus = {
  Created: "created",
  Failed: "failed",
  New: "new",
} as const;

/** A documented tokenized-card status for an Acquiring invoice. */
export type InvoiceWalletStatus =
  (typeof InvoiceWalletStatus)[keyof typeof InvoiceWalletStatus];

/** Importable values accepted by order discount `type` fields. */
export const DiscountType = {
  Discount: "DISCOUNT",
  ExtraCharge: "EXTRA_CHARGE",
} as const;

/** A documented order discount or surcharge type. */
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

/** Importable values accepted by order discount `mode` fields. */
export const DiscountMode = {
  Percent: "PERCENT",
  Value: "VALUE",
} as const;

/** A documented order discount calculation mode. */
export type DiscountMode = (typeof DiscountMode)[keyof typeof DiscountMode];

/** Importable values returned by fiscal check `type` fields. */
export const FiscalCheckType = {
  Return: "return",
  Sale: "sale",
} as const;

/** A documented fiscal check type. */
export type FiscalCheckType =
  (typeof FiscalCheckType)[keyof typeof FiscalCheckType];

/** Importable values returned by fiscal check `status` fields. */
export const FiscalCheckStatus = {
  Done: "done",
  Failed: "failed",
  New: "new",
  Process: "process",
} as const;

/** A documented fiscal check status. */
export type FiscalCheckStatus =
  (typeof FiscalCheckStatus)[keyof typeof FiscalCheckStatus];

/** Importable values returned by fiscal check `fiscalizationSource` fields. */
export const FiscalizationSource = {
  Checkbox: "checkbox",
  Monopay: "monopay",
} as const;

/** A documented service used to fiscalize an Acquiring payment. */
export type FiscalizationSource =
  (typeof FiscalizationSource)[keyof typeof FiscalizationSource];

const dateTimeSchema = z.iso.datetime({ offset: true });

const cancellationSchema = z.looseObject({
  amount: z.optional(z.int()),
  approvalCode: z.optional(z.string()),
  ccy: z.optional(z.int()),
  createdDate: dateTimeSchema,
  extRef: z.optional(z.string()),
  modifiedDate: dateTimeSchema,
  rrn: z.optional(z.string()),
  status: z.enum(InvoiceCancellationStatus),
});

const invoicePaymentInfoSchema = z.looseObject({
  agentFee: z.optional(z.int()),
  approvalCode: z.optional(z.string()),
  bank: z.optional(z.string()),
  country: z.optional(z.string()),
  fee: z.optional(z.int()),
  maskedPan: z.string(),
  paymentMethod: z.enum(InvoicePaymentMethod),
  paymentSystem: z.enum(InvoicePaymentSystem),
  rrn: z.optional(z.string()),
  terminal: z.string(),
  tranId: z.optional(z.string()),
});

const invoiceWalletDataSchema = z.looseObject({
  cardToken: z.string(),
  status: z.enum(InvoiceWalletStatus),
  walletId: z.string(),
});

const invoiceTipsInfoSchema = z.looseObject({
  amount: z.optional(z.int()),
  employeeId: z.string(),
});

/** Runtime validator for `POST /api/merchant/invoice/create` responses. */
export const newInvoiceSchema = z.looseObject({
  invoiceId: z.string(),
  pageUrl: z.string(),
});

/** Newly created invoice identifier and hosted payment-page URL. */
export type NewInvoice = z.infer<typeof newInvoiceSchema>;

/** Runtime validator for `GET /api/merchant/invoice/status` responses. */
export const invoiceStatusSchema = z.looseObject({
  amount: z.int(),
  cancelList: z.optional(z.array(cancellationSchema)),
  ccy: z.int(),
  createdDate: z.optional(dateTimeSchema),
  destination: z.optional(z.string()),
  errCode: z.optional(z.string()),
  failureReason: z.optional(z.string()),
  finalAmount: z.optional(z.int()),
  invoiceId: z.string(),
  modifiedDate: z.optional(dateTimeSchema),
  paymentInfo: z.optional(invoicePaymentInfoSchema),
  reference: z.optional(z.string()),
  status: z.enum(InvoiceStatus),
  tipsInfo: z.optional(invoiceTipsInfoSchema),
  walletData: z.optional(invoiceWalletDataSchema),
});

/** Validated lifecycle, amount, payment, wallet, and cancellation data for an invoice. */
export type Invoice = z.infer<typeof invoiceStatusSchema>;

/** Runtime validator for `POST /api/merchant/invoice/cancel` responses. */
export const cancelInvoiceResponseSchema = cancellationSchema;

/** Accepted cancellation operation and its current status. */
export type InvoiceCancellation = z.infer<typeof cancelInvoiceResponseSchema>;

/** Runtime validator for `POST /api/merchant/invoice/finalize` responses. */
export const finalizeInvoiceResponseSchema = z.looseObject({
  status: z.literal("success"),
});

/** Confirmation that an invoice hold finalization was accepted. */
export type InvoiceFinalization = z.infer<typeof finalizeInvoiceResponseSchema>;

/** Runtime validator for `GET /api/merchant/invoice/receipt` responses. */
export const receiptSchema = z.looseObject({
  file: z.optional(z.string()),
});

/** Base64-encoded invoice receipt when Monobank returns one. */
export type InvoiceReceipt = z.infer<typeof receiptSchema>;

const fiscalCheckSchema = z.looseObject({
  file: z.optional(z.string()),
  fiscalizationSource: z.enum(FiscalizationSource),
  id: z.string(),
  status: z.enum(FiscalCheckStatus),
  statusDescription: z.optional(z.string()),
  taxUrl: z.optional(z.string()),
  type: z.enum(FiscalCheckType),
});

/** Runtime validator for `GET /api/merchant/invoice/fiscal-checks` responses. */
export const invoiceFiscalChecksSchema = z.looseObject({
  checks: z.optional(z.array(fiscalCheckSchema)),
});

/** Fiscal checks created for an invoice, when fiscalization is enabled. */
export type InvoiceFiscalChecks = z.infer<typeof invoiceFiscalChecksSchema>;
