import * as z from "zod/mini";

/** Runtime validator for `GET /api/merchant/qr/details` responses. */
export const acquiringQrDetailsSchema = z.looseObject({
  amount: z.optional(z.int()),
  ccy: z.optional(z.int()),
  invoiceId: z.optional(z.string()),
  shortQrId: z.string(),
});

/** Validated details of one activated Acquiring QR cashier. */
export type AcquiringQrDetails = z.infer<typeof acquiringQrDetailsSchema>;
