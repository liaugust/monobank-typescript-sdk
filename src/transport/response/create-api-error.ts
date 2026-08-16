import { MonobankApiError } from "../../errors/monobank-api-error.js";
import type { MonobankNetworkErrorReason } from "../../errors/monobank-network-error.js";
import { parseRetryAfter } from "../retry/parse-retry-after.js";

export async function createApiError(
  response: Response,
  endpoint: string,
  token: string | undefined,
  reason: () => MonobankNetworkErrorReason,
): Promise<MonobankApiError> {
  const upstreamMessage = sanitizeUpstreamMessage(
    await readResponseText(response, reason),
    token,
  );

  const retryAfterMs = parseRetryAfter(
    response.headers.get("Retry-After"),
    Date.now(),
  );

  return new MonobankApiError({
    endpoint,
    headers: Object.fromEntries(response.headers.entries()),
    message: `Monobank API request failed with status ${String(response.status)}.`,
    status: response.status,
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    ...(upstreamMessage === undefined ? {} : { upstreamMessage }),
  });
}

async function readResponseText(
  response: Response,
  reason: () => MonobankNetworkErrorReason,
): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    if (reason() !== "network" || isAbortError(error)) {
      throw error;
    }

    return "";
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function sanitizeUpstreamMessage(
  responseText: string,
  token: string | undefined,
): string | undefined {
  if (responseText.length === 0) {
    return undefined;
  }

  const jsonMessage = parseErrorDescription(responseText);
  const message = jsonMessage ?? responseText;
  const redacted =
    token === undefined ? message : message.split(token).join("[redacted]");

  return redacted.slice(0, 1_024);
}

function parseErrorDescription(responseText: string): string | undefined {
  try {
    const parsed = JSON.parse(responseText) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "errorDescription" in parsed &&
      typeof parsed.errorDescription === "string"
    ) {
      return parsed.errorDescription;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
