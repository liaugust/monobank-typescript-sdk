/** Components the Corporate API binds together into a single request signature. */
export interface CorporateSignatureInput {
  /**
   * Exact string this SDK expects to be signed.
   *
   * Monobank documents only `Sign (X-Time | URL)`, never whether `URL` includes
   * the query. This SDK signs the path with its query; the other fields let an
   * application rebuild the payload if the bank expects a different composition.
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
 * Signing function returning the `X-Sign` value for one Corporate request.
 *
 * Service keys are secp256k1, which Web Crypto cannot sign with, so the private
 * key stays in the application. Return base64 of the raw 64-byte `r || s` pair,
 * matching Monobank's documented example, not a DER structure; the digest it
 * applies is undocumented. Called once per attempt, because `X-Time` is signed
 * and a retry must not replay a stale timestamp.
 */
export type CorporateSigner = (
  input: CorporateSignatureInput,
) => Promise<string> | string;

/** Corporate service key identifier paired with the signer holding its private key. */
export interface CorporateCredential {
  /**
   * Service key identifier Monobank issues when it approves the company.
   *
   * Absent only before registration: the registration endpoints are what issue
   * it, so they sign without `X-Key-Id`. Every other operation requires it and
   * fails validation ahead of Fetch when it is missing.
   */
  readonly keyId?: string;
  /** Signing function invoked once per request attempt. */
  readonly sign: CorporateSigner;
}
