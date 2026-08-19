/** Importable values accepted by the invoice `displayType` field. */
export const InvoiceDisplayType = {
  Iframe: "iframe",
} as const;

/** A documented Acquiring invoice display type. */
export type InvoiceDisplayType =
  (typeof InvoiceDisplayType)[keyof typeof InvoiceDisplayType];
