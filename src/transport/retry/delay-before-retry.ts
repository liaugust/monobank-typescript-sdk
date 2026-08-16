import { createAbortedError } from "../request/attempt-signal.js";

export function delayBeforeRetry(
  delayMs: number,
  endpoint: string,
  callerSignal?: AbortSignal,
): Promise<void> {
  if (callerSignal?.aborted) {
    return Promise.reject(createAbortedError(endpoint));
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      callerSignal?.removeEventListener("abort", abort);
    };
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);
    const abort = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(createAbortedError(endpoint));
    };

    callerSignal?.addEventListener("abort", abort, { once: true });
  });
}
