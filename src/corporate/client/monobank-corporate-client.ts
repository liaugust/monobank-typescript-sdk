import { MonobankTransport } from "../../transport/transport.js";
import { MonobankCorporateAccess } from "../access/monobank-corporate-access.js";
import { MonobankCorporateClients } from "../clients/monobank-corporate-clients.js";
import { MonobankCorporateCompany } from "../company/monobank-corporate-company.js";
import { MonobankCorporateDocuments } from "../documents/monobank-corporate-documents.js";
import type { MonobankCorporateClientOptions } from "./monobank-corporate-client-options.js";

/**
 * Client for Monobank Corporate provider resources, authenticated by request signing.
 *
 * The Corporate API does not use `X-Token`. Every request carries `X-Key-Id`,
 * `X-Time`, `X-Sign`, and for some endpoints `X-Request-Id`. Keys are secp256k1,
 * which Web Crypto cannot sign with, so only a signing function is injected and
 * the private key stays in the application.
 * @example
 * ```ts
 * const client = new MonobankCorporateClient({
 *   keyId: "28a75537175a018645e6f8b14be7681791e701e0",
 *   sign: ({ payload }) => signWithSecp256k1(payload),
 * });
 * const settings = await client.company.getSettings({ requestId: "req-1" });
 * ```
 */
export class MonobankCorporateClient {
  /** Delegated client-access operations sharing this client's key and transport settings. */
  public readonly access: MonobankCorporateAccess;

  /** Delegated reads of a granted client's data sharing this client's key and transport settings. */
  public readonly clients: MonobankCorporateClients;

  /** Company registration and settings operations sharing this client's key and transport settings. */
  public readonly company: MonobankCorporateCompany;

  /** monoКЕП document signing operations sharing this client's key and transport settings. */
  public readonly documents: MonobankCorporateDocuments;

  /**
   * Creates a Corporate client and its resource classes over one validated transport.
   * @param options Corporate key identifier and signer, plus optional Fetch, base URL, timeout, and retry controls.
   * @throws {MonobankValidationError} When the key identifier, signer, base URL, timeout, retry, or Fetch configuration is invalid.
   */
  public constructor(options: MonobankCorporateClientOptions) {
    const { keyId, sign, ...transportOptions } = options;
    const transport = new MonobankTransport({
      ...transportOptions,
      authenticatedPathPrefix: "/personal/",
      corporate: { ...(keyId === undefined ? {} : { keyId }), sign },
    });

    this.access = new MonobankCorporateAccess(transport);
    this.clients = new MonobankCorporateClients(transport);
    this.company = new MonobankCorporateCompany(transport);
    this.documents = new MonobankCorporateDocuments(transport);
  }
}
