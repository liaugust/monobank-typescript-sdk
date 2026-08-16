import type { MonobankNetworkErrorReason } from "../../errors/monobank-network-error.js";
import { MonobankNetworkError } from "../../errors/monobank-network-error.js";

export interface AttemptSignal {
  readonly cleanup: () => void;
  readonly reason: () => MonobankNetworkErrorReason;
  readonly signal: AbortSignal;
}

export function createAttemptSignal(
  timeoutMs: number,
  callerSignal?: AbortSignal,
): AttemptSignal {
  const controller = new AbortController();
  let reason: MonobankNetworkErrorReason = "network";
  const timeoutId = setTimeout(() => {
    reason = "timeout";
    controller.abort();
  }, timeoutMs);
  const abort = () => {
    reason = "aborted";
    controller.abort();
  };

  callerSignal?.addEventListener("abort", abort, { once: true });

  return {
    cleanup() {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener("abort", abort);
    },
    reason() {
      return reason;
    },
    signal: controller.signal,
  };
}

export function createAbortedError(endpoint: string): MonobankNetworkError {
  return new MonobankNetworkError({
    endpoint,
    message: "Monobank request was aborted before receiving a response.",
    reason: "aborted",
  });
}
