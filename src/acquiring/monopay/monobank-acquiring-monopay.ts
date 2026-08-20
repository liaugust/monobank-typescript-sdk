import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { DeleteMonopaySigningKeyInput } from "./delete-monopay-key/delete-monopay-key.js";
import {
  createDeleteMonopaySigningKeyBody,
  deleteMonopaySigningKeyEndpoint,
} from "./delete-monopay-key/delete-monopay-key.js";
import type {
  ImportedMonopaySigningKey,
  ImportMonopaySigningKeyInput,
} from "./import-monopay-key/import-monopay-key.js";
import {
  createImportMonopaySigningKeyBody,
  importedMonopaySigningKeySchema,
  importMonopaySigningKeyEndpoint,
} from "./import-monopay-key/import-monopay-key.js";
import { listMonopaySigningKeysEndpoint } from "./list-monopay-keys/list-monopay-keys.js";
import type { MonopaySigningKeyList } from "./models/monopay-signing-key.js";
import { monopaySigningKeyListSchema } from "./models/monopay-signing-key.js";

/** monopay button signing-key operations for the JavaScript widget. */
export class MonobankAcquiringMonopay {
  private readonly transport: MonobankTransport;

  /**
   * Creates the monopay resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Deletes one monopay button signing key.
   *
   * Monobank returns an empty success payload, so this resolves to `undefined`.
   * Deleting a key invalidates every widget signature made with it, so confirm
   * the key is unused first. The request mutates merchant state and is never
   * retried, even when the parent client has a retry policy. A provided
   * `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * await client.monopay.deleteKey({ keyId: "28F91hHGtzoSFJ" });
   * ```
   * @param input Key identifier returned by `listKeys()`.
   * @param options Optional cancellation controls for this request.
   * @returns Nothing; Monobank acknowledges the deletion with an empty payload.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including an unknown key.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When `keyId` is not a nonempty string without surrounding whitespace.
   */
  public async deleteKey(
    input: DeleteMonopaySigningKeyInput,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.postEmpty({
      auth: true,
      body: createDeleteMonopaySigningKeyBody(input),
      endpoint: deleteMonopaySigningKeyEndpoint,
      retryable: false,
      ...requestSignal(options),
    });
  }

  /**
   * Imports a public key Monobank will use to verify widget order signatures.
   *
   * `keyValue` is the Base64-encoded public half of a merchant-owned key pair;
   * the private half signs widget order data and must never enter this SDK. The
   * request mutates merchant state and is never retried, even when the parent
   * client has a retry policy. A provided `RequestOptions.signal` cancels the
   * active attempt.
   * @example
   * ```ts
   * const imported = await client.monopay.importKey({
   *   keyName: "widget-2026",
   *   keyValue: base64PublicKey,
   * });
   * ```
   * @param input Base64 key value and optional label and expiry.
   * @param options Optional cancellation controls for this request.
   * @returns Validated identifier Monobank assigned to the imported key.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the imported-key schema.
   * @throws {MonobankValidationError} When `keyValue` or `keyName` is blank, or `expiresAt` is not a timestamp.
   */
  public async importKey(
    input: ImportMonopaySigningKeyInput,
    options?: RequestOptions,
  ): Promise<ImportedMonopaySigningKey> {
    return await this.transport.postJson({
      auth: true,
      body: createImportMonopaySigningKeyBody(input),
      endpoint: importMonopaySigningKeyEndpoint,
      retryable: false,
      schema: importedMonopaySigningKeySchema,
      ...requestSignal(options),
    });
  }

  /**
   * Lists the signing keys registered for the monopay button.
   *
   * This safe authenticated GET is retried only when the parent client has a
   * bounded retry policy. A provided `RequestOptions.signal` cancels the active
   * attempt or retry delay.
   * @example
   * ```ts
   * const keys = await client.monopay.listKeys();
   * ```
   * @param options Optional cancellation controls for this request.
   * @returns Validated list of registered signing keys.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the key-list schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public listKeys(options?: RequestOptions): Promise<MonopaySigningKeyList> {
    return this.transport.getJson({
      auth: true,
      endpoint: listMonopaySigningKeysEndpoint,
      retryable: true,
      schema: monopaySigningKeyListSchema,
      ...requestSignal(options),
    });
  }
}
