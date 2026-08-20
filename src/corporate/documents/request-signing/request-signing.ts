import * as z from "zod/mini";

import { requireAbsoluteHttpUrl } from "../../../shared/http-url.js";
import { parseMonobankRequest } from "../../../shared/request-validation.js";
import type { SigningDocumentType } from "../models/signing-document.js";
import { SigningDocumentType as documentTypes } from "../models/signing-document.js";

const gostHashPattern = /^[0-9a-f]{64}$/iu;

/** One document submitted for monoКЕП signing. */
export interface SigningDocumentInput {
  /**
   * Document hash as 64 hex characters, using **ГОСТ 34.311-95**.
   *
   * Neither Web Crypto nor `node:crypto` implements that algorithm, so the SDK
   * never computes or verifies the digest itself: only the hex shape (64
   * characters, `0-9a-f`) is checked, which catches an obviously wrong value
   * such as a truncated string but not a same-length SHA-256 digest computed
   * by mistake instead of ГОСТ 34.311-95 — that produces a well-formed but
   * silently wrong request.
   */
  readonly hash: string;
  /** Link to the document shown to the signatory. */
  readonly link?: string;
  /** Document name shown to the signatory. */
  readonly name: string;
  /** Document type; omission leaves it unspecified upstream. */
  readonly type?: SigningDocumentType;
}

/** Input creating a monoКЕП signing request. */
export interface RequestDocumentSigningInput {
  /** Absolute HTTP(S) address monoКЕП notifies about signing progress. */
  readonly callbackUrl?: string;
  /** One to ten documents to sign. */
  readonly documents: readonly SigningDocumentInput[];
  /** Whether a single signatory suffices; Monobank defaults this to `true`. */
  readonly oneSigner?: boolean;
}

/** Root-relative endpoint for creating a monoКЕП signing request. */
export const requestDocumentSigningEndpoint = "/personal/signature/create";

const nonempty = () =>
  z.string().check(z.refine((value) => value.trim().length > 0));

const requestDocumentSigningSchema = z.object({
  callbackUrl: z.optional(z.string()),
  documents: z
    .array(
      z.object({
        hash: z
          .string()
          .check(z.refine((value) => gostHashPattern.test(value))),
        link: z.optional(z.string()),
        name: nonempty(),
        type: z.optional(z.enum(documentTypes)),
      }),
    )
    .check(z.minLength(1), z.maxLength(10)),
  oneSigner: z.optional(z.boolean()),
});

/**
 * Runtime validator for the `/personal/signature/create` response.
 *
 * Both fields are marked required upstream: `requestId` identifies the request
 * in every later call, and `deeplink` is what the signatory opens.
 */
export const documentSigningRequestSchema = z.looseObject({
  deeplink: z.string(),
  requestId: z.string(),
});

/** Created monoКЕП signing request and the deeplink a signatory opens. */
export type DocumentSigningRequest = z.infer<
  typeof documentSigningRequestSchema
>;

type RequestDocumentSigningBody = z.infer<typeof requestDocumentSigningSchema>;

/**
 * Validates the signing request ahead of Fetch.
 * @param input Documents, signer policy, and optional callback address.
 * @returns Parsed request body.
 * @throws {MonobankValidationError} When the document list is empty, longer than ten, a document lacks a name or a well-formed hash, or the callback address is not an absolute HTTP(S) URL.
 */
export function parseRequestDocumentSigningInput(
  input: RequestDocumentSigningInput,
): RequestDocumentSigningBody {
  const parsed = parseMonobankRequest(
    requestDocumentSigningSchema,
    input,
    requestDocumentSigningEndpoint,
    "Invalid monoKEP signing request.",
  );

  if (parsed.callbackUrl !== undefined) {
    requireAbsoluteHttpUrl(
      parsed.callbackUrl,
      "callbackUrl",
      requestDocumentSigningEndpoint,
      "Invalid monoKEP signing request.",
    );
  }

  return parsed;
}
