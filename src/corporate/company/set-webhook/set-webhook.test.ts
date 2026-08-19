import { describe, expect, it, vi } from "vitest";

import {
  createFetchSequence,
  jsonResponse,
} from "../../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestBody,
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../../tests/support/fetch-request-inspection.js";
import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { CorporateSigner } from "../../../transport/corporate-signer.js";
import { MonobankCorporateClient } from "../../client/monobank-corporate-client.js";
import type { SetCorporateWebhookInput } from "./set-webhook.js";

function createClient(
  fetch: ReturnType<typeof createFetchSequence>,
  sign: CorporateSigner = () => "c2ln",
) {
  return new MonobankCorporateClient({
    fetch,
    keyId: "28a75537175a018645e6f8b14be7681791e701e0",
    sign,
  });
}

describe("company.setWebhook", () => {
  it("sends the signed webhook mutation with the full header set", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = createClient(fetch, sign);

    await client.company.setWebhook({
      requestId: "corp-request-id",
      webHookUrl: "https://example.com/mono/corp/webhook/synthetic",
    });

    expect(firstRequestUrl(fetch).pathname).toBe("/personal/corp/webhook");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestBody(fetch)).toEqual({
      webHookUrl: "https://example.com/mono/corp/webhook/synthetic",
    });

    const headers = firstRequestHeaders(fetch);
    expect(headers.get("X-Key-Id")).toBe(
      "28a75537175a018645e6f8b14be7681791e701e0",
    );
    expect(headers.get("X-Request-Id")).toBe("corp-request-id");
    expect(sign.mock.calls[0]?.[0]?.payload).not.toContain("corp-request-id");
  });

  it("removes the webhook with an empty URL", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createClient(fetch);

    await client.company.setWebhook({
      requestId: "corp-request-id",
      webHookUrl: "",
    });

    expect(firstRequestBody(fetch)).toEqual({ webHookUrl: "" });
  });

  it.each([
    ["a relative URL", "mono/webhook"],
    ["a non-HTTP protocol", "ftp://example.com/webhook"],
  ])("rejects %s before Fetch", async (_label, webHookUrl) => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createClient(fetch);

    await expect(
      client.company.setWebhook({ requestId: "corp-request-id", webHookUrl }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["an absent request identifier", undefined],
    ["a blank request identifier", " "],
    ["a request identifier that would inject a header", "req\r\nX-Token: x"],
  ])("rejects %s before Fetch", async (_label, requestId) => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createClient(fetch);

    await expect(
      client.company.setWebhook({
        webHookUrl: "https://example.com/webhook",
        ...(requestId === undefined ? {} : { requestId }),
      } as SetCorporateWebhookInput),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports the corporate endpoint rather than the personal one", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createClient(fetch);

    const rejection = await client.company
      .setWebhook({ requestId: "corp-request-id", webHookUrl: "mono/webhook" })
      .catch((error: unknown) => error);

    expect(rejection).toMatchObject({
      endpoint: "/personal/corp/webhook",
      message: "Invalid corporate webhook request.",
    });
  });

  it("rejects the mutation when the client has no key identifier", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = new MonobankCorporateClient({ fetch, sign: () => "c2ln" });

    await expect(
      client.company.setWebhook({
        requestId: "corp-request-id",
        webHookUrl: "https://example.com/mono/corp/webhook/synthetic",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
