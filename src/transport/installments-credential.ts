/** Store credentials authenticating Покупка Частинами requests. */
export interface InstallmentsCredential {
  /** Store identifier Monobank issued, sent verbatim as `store-id`. */
  readonly storeId: string;
  /**
   * Shared secret the request signature is derived from.
   *
   * Unlike the Corporate service key, this one is a symmetric HMAC secret that
   * Web Crypto can use directly, so the SDK signs each request itself instead of
   * taking an injected signer. Treat it as credential material: it authorizes
   * every call this client makes.
   */
  readonly storeSecret: string;
}
