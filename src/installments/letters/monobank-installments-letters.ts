import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankBinaryPayload } from "../../transport/response/read-binary-payload.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { InstallmentsLetterInput } from "./get-letter-data/get-letter-data.js";
import {
  createInstallmentsLetterBody,
  downloadInstallmentsLetterEndpoint,
  getInstallmentsLetterDataEndpoint,
  getInstallmentsLetterDataV2Endpoint,
} from "./get-letter-data/get-letter-data.js";
import type { InstallmentsGuaranteeLetterData } from "./models/installments-guarantee-letter-data.js";
import { installmentsGuaranteeLetterDataSchema } from "./models/installments-guarantee-letter-data.js";

/** Покупка Частинами guarantee-letter operations. */
export class MonobankInstallmentsLetters {
  private readonly transport: MonobankTransport;

  /**
   * Creates the guarantee-letter resource over the parent client's signed transport.
   * @param transport Shared installments transport owned by `MonobankInstallmentsClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Downloads the guarantee letter itself as a document.
   *
   * This is the one endpoint in the package whose success is not JSON: Monobank
   * returns the letter as a file, so the result carries raw `bytes` and the
   * declared `contentType` instead of a validated object. Nothing decodes the
   * body, and an empty success is rejected as a broken response rather than handed
   * over as an empty file. The request asks for `application/pdf`, and the
   * returned `contentType` is what Monobank actually declared, so check it before
   * assuming a PDF.
   *
   * The document contains the customer's identity data. Store it under the same
   * rules as `getData()`, and never write it somewhere world-readable.
   * @example
   * ```ts
   * const letter = await client.letters.download({ order_id: orderId });
   *
   * await writeFile("guarantee-letter.pdf", letter.bytes);
   * ```
   * @param input Order identifier and optional invoice reference.
   * @param options Optional cancellation controls for this request.
   * @returns Raw document bytes and the declared content type.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful response carries no body.
   * @throws {MonobankValidationError} When `order_id` is not a UUID.
   */
  public async download(
    input: InstallmentsLetterInput,
    options?: RequestOptions,
  ): Promise<MonobankBinaryPayload> {
    return await this.transport.postBinary({
      auth: true,
      body: createInstallmentsLetterBody(
        input,
        downloadInstallmentsLetterEndpoint,
      ),
      endpoint: downloadInstallmentsLetterEndpoint,
      headers: { Accept: "application/pdf" },
      retryable: false,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Reads the source data behind a guarantee letter.
   *
   * **This is the most sensitive payload in the package.** The customer block
   * carries a full name, a tax identifier, and up to four government identity
   * documents — passport, ID card, residence permit, and international passport.
   * Read only what the letter requires, keep it out of logs, and hold it under the
   * caller's own retention rules.
   *
   * Amounts are hryvnia rather than minor units, and `answer_datetime` is
   * explicitly `null` until set. Never retried automatically. A provided
   * `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * const data = await client.letters.getData({ order_id: orderId });
   * ```
   * @param input Order identifier and optional invoice reference.
   * @param options Optional cancellation controls for this request.
   * @returns Validated guarantee-letter source data.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the letter schema.
   * @throws {MonobankValidationError} When `order_id` is not a UUID.
   */
  public async getData(
    input: InstallmentsLetterInput,
    options?: RequestOptions,
  ): Promise<InstallmentsGuaranteeLetterData> {
    return await this.transport.postJson({
      auth: true,
      body: createInstallmentsLetterBody(
        input,
        getInstallmentsLetterDataEndpoint,
      ),
      endpoint: getInstallmentsLetterDataEndpoint,
      retryable: false,
      schema: installmentsGuaranteeLetterDataSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Reads guarantee-letter source data from the v2 endpoint.
   *
   * Monobank documents the same structure as `getData()`, with `contract_number`
   * and `contract_date` added to the header, so both share one schema. The same
   * identity data and the same handling rules apply.
   * @example
   * ```ts
   * const data = await client.letters.getDataV2({ order_id: orderId });
   * ```
   * @param input Order identifier and optional invoice reference.
   * @param options Optional cancellation controls for this request.
   * @returns Validated guarantee-letter source data.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the letter schema.
   * @throws {MonobankValidationError} When `order_id` is not a UUID.
   */
  public async getDataV2(
    input: InstallmentsLetterInput,
    options?: RequestOptions,
  ): Promise<InstallmentsGuaranteeLetterData> {
    return await this.transport.postJson({
      auth: true,
      body: createInstallmentsLetterBody(
        input,
        getInstallmentsLetterDataV2Endpoint,
      ),
      endpoint: getInstallmentsLetterDataV2Endpoint,
      retryable: false,
      schema: installmentsGuaranteeLetterDataSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
