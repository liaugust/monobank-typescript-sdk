import { vi } from "vitest";

/** Creates a pending Fetch probe that rejects when its received signal aborts. */
export function createAbortableFetch() {
  let requestSignal: AbortSignal | undefined;
  const fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    requestSignal = init?.signal ?? undefined;

    return new Promise<Response>((_resolve, reject) => {
      requestSignal?.addEventListener("abort", () => {
        reject(new DOMException("Request aborted", "AbortError"));
      });
    });
  });

  return {
    fetch,
    requestSignal: (): AbortSignal | undefined => requestSignal,
  };
}
