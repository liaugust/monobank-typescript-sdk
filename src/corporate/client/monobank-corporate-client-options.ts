import type { CorporateSigner } from "../../transport/corporate-signer.js";
import type { FetchLike } from "../../transport/fetch-like.js";
import type { RetryOptions } from "../../transport/retry-options.js";

/** Configuration for the Corporate client and its shared signed Fetch transport. */
export interface MonobankCorporateClientOptions {
  /** Absolute HTTP(S) Monobank API origin, primarily for tests and controlled proxies. */
  readonly baseUrl?: string;
  /** Fetch-compatible implementation used for every Corporate request. */
  readonly fetch?: FetchLike;
  /** Service key identifier sent as `X-Key-Id`, issued when Monobank approves the company. */
  readonly keyId: string;
  /** Optional bounded retry policy; when omitted, endpoint methods make one attempt. */
  readonly retry?: RetryOptions;
  /** Signing function producing `X-Sign`; the SDK never holds the secp256k1 private key. */
  readonly sign: CorporateSigner;
  /** Per-attempt timeout in milliseconds before a request is classified as timed out. */
  readonly timeoutMs?: number;
}
