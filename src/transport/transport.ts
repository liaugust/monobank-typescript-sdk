import { MonobankApiError } from "../errors/monobank-api-error.js";
import type { MonobankNetworkErrorReason } from "../errors/monobank-network-error.js";
import { MonobankNetworkError } from "../errors/monobank-network-error.js";
import { MonobankResponseValidationError } from "../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import {
  createAbortedError,
  createAttemptSignal,
} from "./request/attempt-signal.js";
import type { EmptyRequest, JsonRequest } from "./request/request.js";
import { createRequestInit, resolveRequestUrl } from "./request/request.js";
import { createApiError } from "./response/create-api-error.js";
import { parseSuccessJson } from "./response/parse-success-json.js";
import { delayBeforeRetry } from "./retry/delay-before-retry.js";
import {
  retryDelayForApiError,
  retryDelayForNetworkError,
} from "./retry/retry-policy.js";
import type {
  StoredTransportOptions,
  TransportOptions,
} from "./transport-options.js";
import { validateTransportOptions } from "./transport-options.js";

export class MonobankTransport {
  private readonly options: StoredTransportOptions;

  public constructor(options: TransportOptions) {
    this.options = validateTransportOptions(options);
  }

  public async getJson<T>(request: JsonRequest<T>): Promise<T> {
    return this.executeJson("GET", request);
  }

  public async postJson<T>(request: JsonRequest<T>): Promise<T> {
    return this.executeJson("POST", request);
  }

  public async postEmpty(request: EmptyRequest): Promise<void> {
    await this.executeEmpty("POST", request);
  }

  public async deleteEmpty(request: EmptyRequest): Promise<void> {
    await this.executeEmpty("DELETE", request);
  }

  private async executeEmpty(
    method: "DELETE" | "POST",
    request: EmptyRequest,
  ): Promise<void> {
    await this.execute(method, request, async (response) => {
      await response.text();
    });
  }

  private async executeJson<T>(
    method: "GET" | "POST",
    request: JsonRequest<T>,
  ): Promise<T> {
    return this.execute(method, request, async (response) => {
      const payload = await parseSuccessJson(response, request.endpoint);
      const parsed = request.schema.safeParse(payload);

      if (!parsed.success) {
        throw new MonobankResponseValidationError({
          endpoint: request.endpoint,
          issues: parsed.error.issues,
          message: "Monobank response did not match the expected schema.",
        });
      }

      return parsed.data;
    });
  }

  private async execute<T>(
    method: "DELETE" | "GET" | "POST",
    request: EmptyRequest,
    consumeResponse: (response: Response) => Promise<T> | T,
  ): Promise<T> {
    const url = resolveRequestUrl(request, this.options);
    let attempt = 1;

    for (;;) {
      if (request.signal?.aborted) {
        throw createAbortedError(request.endpoint);
      }

      const attemptSignal = createAttemptSignal(
        this.options.timeoutMs,
        request.signal,
      );
      try {
        const init = await createRequestInit(
          method,
          request,
          this.options,
          url,
        );
        const response = await this.options.fetch(url, {
          ...init,
          signal: attemptSignal.signal,
        });

        if (response.ok) {
          return await consumeResponse(response);
        }

        const error = await createApiError(
          response,
          request.endpoint,
          this.options.token,
          attemptSignal.reason,
        );
        const delayMs = retryDelayForApiError(
          error,
          method,
          request,
          this.options.retry,
          attempt,
        );
        if (delayMs === undefined) {
          throw error;
        }

        attemptSignal.cleanup();
        await delayBeforeRetry(delayMs, request.endpoint, request.signal);
        attempt += 1;
      } catch (error) {
        if (isNonNetworkTransportError(error)) {
          throw error;
        }

        const networkError =
          error instanceof MonobankNetworkError
            ? error
            : createNetworkErrorFromUnknown(
                request.endpoint,
                attemptSignal.reason(),
              );
        const delayMs = retryDelayForNetworkError(
          networkError,
          method,
          request,
          this.options.retry,
          attempt,
        );
        if (delayMs === undefined) {
          throw networkError;
        }

        attemptSignal.cleanup();
        await delayBeforeRetry(delayMs, request.endpoint, request.signal);
        attempt += 1;
        continue;
      } finally {
        attemptSignal.cleanup();
      }
    }
  }
}

function isNonNetworkTransportError(
  error: unknown,
): error is
  MonobankApiError | MonobankResponseValidationError | MonobankValidationError {
  return (
    error instanceof MonobankApiError ||
    error instanceof MonobankResponseValidationError ||
    error instanceof MonobankValidationError
  );
}

function createNetworkErrorFromUnknown(
  endpoint: string,
  reason: MonobankNetworkErrorReason,
): MonobankNetworkError {
  return new MonobankNetworkError({
    endpoint,
    message: "Monobank request failed before receiving a response.",
    reason,
  });
}
