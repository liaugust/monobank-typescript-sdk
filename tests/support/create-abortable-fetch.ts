import { vi } from "vitest";

/**
 * Creates a pending Fetch probe that rejects when its received signal aborts.
 *
 * An already-aborted signal rejects immediately, as Fetch itself does, so a
 * caller that aborts before the request reaches Fetch is not left hanging.
 */
export function createAbortableFetch() {
  let requestSignal: AbortSignal | undefined;
  let markEntered: () => void = () => undefined;
  const entered = new Promise<void>((resolve) => {
    markEntered = resolve;
  });
  const fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    requestSignal = init?.signal ?? undefined;
    markEntered();

    return new Promise<Response>((_resolve, reject) => {
      const abort = () => {
        reject(new DOMException("Request aborted", "AbortError"));
      };

      if (requestSignal?.aborted === true) {
        abort();

        return;
      }

      requestSignal?.addEventListener("abort", abort);
    });
  });

  return {
    entered,
    fetch,
    requestSignal: (): AbortSignal | undefined => requestSignal,
  };
}
