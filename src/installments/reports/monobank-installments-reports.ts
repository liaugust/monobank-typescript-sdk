import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type {
  GetInstallmentsStoreReportInput,
  InstallmentsStoreReport,
} from "./get-store-report/get-store-report.js";
import {
  createGetInstallmentsStoreReportBody,
  getInstallmentsStoreReportEndpoint,
  installmentsStoreReportSchema,
} from "./get-store-report/get-store-report.js";

/** Покупка Частинами store reporting. */
export class MonobankInstallmentsReports {
  private readonly transport: MonobankTransport;

  /**
   * Creates the reporting resource over the parent client's signed transport.
   * @param transport Shared installments transport owned by `MonobankInstallmentsClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Reads the store's settled orders for one day.
   *
   * `date` is `YYYY-MM-DD`, and each line reports what was transferred against
   * what was ordered, with `commission` and `commission_percent` explaining the
   * difference. Those sums are hryvnia rather than minor units, and
   * `operation_timestamp` is explicitly `null` until the transfer is made, so an
   * order can appear before its money moves. Never retried automatically. A
   * provided `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * const report = await client.reports.getStoreReport({ date: "2024-01-15" });
   * ```
   * @param input Report day as `YYYY-MM-DD`.
   * @param options Optional cancellation controls for this request.
   * @returns Validated report of the day's settled orders.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the report schema.
   * @throws {MonobankValidationError} When the date is not `YYYY-MM-DD`.
   */
  public async getStoreReport(
    input: GetInstallmentsStoreReportInput,
    options?: RequestOptions,
  ): Promise<InstallmentsStoreReport> {
    return await this.transport.postJson({
      auth: true,
      body: createGetInstallmentsStoreReportBody(input),
      endpoint: getInstallmentsStoreReportEndpoint,
      retryable: false,
      schema: installmentsStoreReportSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
