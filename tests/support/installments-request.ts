import { createHmac } from "node:crypto";

import { expect } from "vitest";

import type { createFetchSequence } from "./create-fetch-sequence.js";
import {
  firstRequestBody,
  firstRequestHeaders,
  firstRequestUrl,
} from "./fetch-request-inspection.js";
import { installmentsTestStoreSecret } from "./installments-client.js";

export function expectSignedInstallmentsRequest(
  fetch: ReturnType<typeof createFetchSequence>,
  body: unknown,
  pathname: string,
): void {
  const headers = firstRequestHeaders(fetch);
  const signature = createHmac("sha256", installmentsTestStoreSecret)
    .update(JSON.stringify(body))
    .digest("base64");

  expect(firstRequestBody(fetch)).toEqual(body);
  expect(firstRequestUrl(fetch).href).toBe(
    `https://u2.monobank.com.ua${pathname}`,
  );
  expect(headers.get("store-id")).toBe("test_store_with_confirm");
  expect(headers.get("signature")).toBe(signature);
  expect(headers.get("X-Token")).toBeNull();
  expect(headers.get("X-Sign")).toBeNull();
  expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
}
