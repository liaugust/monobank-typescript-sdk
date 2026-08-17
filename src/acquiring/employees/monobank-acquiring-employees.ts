import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import { listAcquiringEmployeesEndpoint } from "./list-employees/list-employees.js";
import type { AcquiringEmployeeList } from "./models/acquiring-employee.js";
import { acquiringEmployeeListSchema } from "./models/acquiring-employee.js";

/** Acquiring employee operations for merchants that collect tips. */
export class MonobankAcquiringEmployees {
  private readonly transport: MonobankTransport;

  /**
   * Creates the employees resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Lists the employees the merchant registered as tip recipients.
   *
   * Each `id` is accepted by `tipsEmployeeId` when creating an invoice, and is
   * echoed back in `tipsInfo.employeeId` on invoice status. This safe
   * authenticated GET is retried only when the parent client has a bounded
   * retry policy. A provided `RequestOptions.signal` cancels the active attempt
   * or retry delay.
   * @example
   * ```ts
   * const employees = await client.employees.list();
   * ```
   * @param options Optional cancellation controls for this request.
   * @returns Validated Acquiring employee-list response.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the employee-list schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public list(options?: RequestOptions): Promise<AcquiringEmployeeList> {
    return this.transport.getJson({
      auth: true,
      endpoint: listAcquiringEmployeesEndpoint,
      retryable: true,
      schema: acquiringEmployeeListSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
