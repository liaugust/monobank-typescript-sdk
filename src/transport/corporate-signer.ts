/** Components the Corporate API binds together into a single request signature. */
export interface CorporateSignatureInput {
  /**
   * Exact string this SDK expects to be signed for the request.
   *
   * Monobank documents the composition only as `Sign (X-Time | URL)`, which
   * does not state whether `URL` means the path, the path with its query, or an
   * absolute URL. This SDK signs the path together with its query. The
   * components are supplied alongside the payload so an application can rebuild
   * it if the bank turns out to expect a different composition.
   */
  readonly payload: string;
  /** Value sent as `X-Request-Id`, present only for endpoints that send one. */
  readonly requestId?: string;
  /** Value sent as `X-Time`: current UTC time in whole seconds as a decimal string. */
  readonly time: string;
  /** Absolute request URL the payload was derived from. */
  readonly url: URL;
}

/**
 * Signing function that returns the `X-Sign` value for one Corporate request.
 *
 * Corporate service keys are secp256k1, which Web Crypto cannot sign with, so
 * the SDK never holds the private key and delegates signing to the application.
 * The returned string is sent verbatim as `X-Sign`. Monobank's own documented
 * example decodes to the raw 64-byte `r || s` pair rather than a DER structure,
 * and the digest applied before signing is not documented at all.
 *
 * The function is invoked once per request attempt, because `X-Time` is part of
 * the signed payload and a retry after a backoff delay must not replay a stale
 * timestamp.
 */
export type CorporateSigner = (
  input: CorporateSignatureInput,
) => Promise<string> | string;

/** Corporate service key identifier paired with the signer holding its private key. */
export interface CorporateCredential {
  /** Service key identifier Monobank issues when it approves the company. */
  readonly keyId: string;
  /** Signing function invoked once per request attempt. */
  readonly sign: CorporateSigner;
}
