import * as z from "zod/mini";

/** Runtime validator for a QR cart creation response; the documented UUID is optional. */
export const installmentsQrCartSchema = z.looseObject({
  id: z.optional(z.uuid()),
});
/** Created QR cart identifier, when supplied by Monobank. */
export type InstallmentsQrCart = z.infer<typeof installmentsQrCartSchema>;
