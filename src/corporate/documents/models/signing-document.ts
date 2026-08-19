import * as z from "zod/mini";

/** Importable per-document signing states returned by monoКЕП. */
export const DocumentSigningState = {
  Canceled: "canceled",
  Expired: "expired",
  Pending: "pending",
  Signed: "signed",
} as const;

/** A documented monoКЕП document signing state. */
export type DocumentSigningState =
  (typeof DocumentSigningState)[keyof typeof DocumentSigningState];

/** Importable document types monoКЕП accepts. */
export const SigningDocumentType = {
  Doc: "doc",
  Docx: "docx",
  Html: "html",
  Jpeg: "jpeg",
  Jpg: "jpg",
  Json: "json",
  Odt: "odt",
  Other: "other",
  Pdf: "pdf",
  Png: "png",
  Xml: "xml",
} as const;

/** A documented monoКЕП document type. */
export type SigningDocumentType =
  (typeof SigningDocumentType)[keyof typeof SigningDocumentType];

/** Runtime validator for one signatory of a signed document. */
export const documentSignatorySchema = z.looseObject({
  certSerial: z.string(),
  company: z.optional(z.string()),
  date: z.string(),
  edrpou: z.optional(z.string()),
  name: z.string(),
  post: z.optional(z.string()),
  signature: z.string(),
  tin: z.string(),
});

/** One validated signatory, including their Base64 signature and certificate serial. */
export type DocumentSignatory = z.infer<typeof documentSignatorySchema>;

/**
 * Runtime validator for one document in a monoКЕП signing request.
 *
 * `status` and `signers` are absent until signing progresses, and the
 * specification does not mark either required, so both stay optional.
 */
export const signingDocumentSchema = z.looseObject({
  hash: z.string(),
  link: z.optional(z.string()),
  name: z.string(),
  signers: z.optional(z.array(documentSignatorySchema)),
  status: z.optional(z.enum(DocumentSigningState)),
  type: z.optional(z.enum(SigningDocumentType)),
});

/** One validated document with its signing state and signatories. */
export type SigningDocument = z.infer<typeof signingDocumentSchema>;
