import * as z from "zod/mini";

/**
 * Runtime validator for one tap-to-phone payment.
 *
 * Only `status` is required, because Monobank documents this response with a
 * sample rather than a schema. Three fields diverge from the conventions the
 * rest of the API follows, and are modelled as documented rather than
 * normalized: `ccy` is an alphabetic code such as `UAH` instead of a numeric
 * ISO 4217 code, `dataTime` is space-separated rather than RFC-3339, and
 * `errorMessage` is explicitly `null` on success. `maskedPan` carries the
 * masked card number while `cardMask` carries the scheme name, which reads as
 * transposed but is preserved as upstream spells it.
 */
export const acquiringT2pPaymentSchema = z.looseObject({
  amount: z.optional(z.int()),
  approvalCode: z.optional(z.string()),
  bank: z.optional(z.string()),
  cardMask: z.optional(z.string()),
  ccy: z.optional(z.string()),
  countryCard: z.optional(z.string()),
  dataTime: z.optional(z.string()),
  errorMessage: z.optional(z.nullable(z.string())),
  externalPaymentId: z.optional(z.string()),
  internalPaymentId: z.optional(z.string()),
  maskedPan: z.optional(z.string()),
  paymentType: z.optional(z.string()),
  responseCode: z.optional(z.string()),
  rrn: z.optional(z.string()),
  status: z.string(),
  terminal: z.optional(z.string()),
  transactionId: z.optional(z.string()),
});

/** One validated tap-to-phone payment. */
export type AcquiringT2pPayment = z.infer<typeof acquiringT2pPaymentSchema>;
