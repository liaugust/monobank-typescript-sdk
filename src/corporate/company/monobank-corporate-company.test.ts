import { describe, expect, it, vi } from "vitest";

import { corporateSettingsFixture } from "../../../tests/fixtures/corporate/company.js";
import { createAbortableFetch } from "../../../tests/support/create-abortable-fetch.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import type { CorporateSigner } from "../../transport/corporate-signer.js";
import { MonobankCorporateClient } from "../client/monobank-corporate-client.js";

function createClient(
  fetch: ReturnType<typeof createFetchSequence>,
  sign = vi.fn<CorporateSigner>(() => "c2lnbmF0dXJl"),
) {
  return {
    client: new MonobankCorporateClient({
      fetch,
      keyId: "28a75537175a018645e6f8b14be7681791e701e0",
      sign,
    }),
    sign,
  };
}

describe("MonobankCorporateCompany", () => {
  it("reads company settings from the signed corporate endpoint", async () => {
    const fetch = createFetchSequence([jsonResponse(corporateSettingsFixture)]);
    const { client } = createClient(fetch);

    const settings = await client.company.getSettings({
      requestId: "corp-request-id",
    });

    expect(settings).toEqual(corporateSettingsFixture);
    expect(firstRequestUrl(fetch).pathname).toBe("/personal/corp/settings");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("sends the four signed corporate headers and never a token", async () => {
    const fetch = createFetchSequence([jsonResponse(corporateSettingsFixture)]);
    const { client } = createClient(fetch);

    await client.company.getSettings({ requestId: "corp-request-id" });

    const headers = firstRequestHeaders(fetch);
    expect(headers.get("X-Key-Id")).toBe(
      "28a75537175a018645e6f8b14be7681791e701e0",
    );
    expect(headers.get("X-Request-Id")).toBe("corp-request-id");
    expect(headers.get("X-Sign")).toBe("c2lnbmF0dXJl");
    expect(headers.get("X-Time")).toMatch(/^\d+$/);
    expect(headers.has("X-Token")).toBe(false);
  });

  it("signs the documented time and url payload without the request id", async () => {
    const fetch = createFetchSequence([jsonResponse(corporateSettingsFixture)]);
    const sign = vi.fn<CorporateSigner>(() => "c2lnbmF0dXJl");
    const { client } = createClient(fetch, sign);

    await client.company.getSettings({ requestId: "corp-request-id" });

    const input = sign.mock.calls[0]?.[0];
    const time = firstRequestHeaders(fetch).get("X-Time");
    expect(input).toMatchObject({
      payload: `${time ?? ""}/personal/corp/settings`,
      requestId: "corp-request-id",
      time,
    });
    expect(input?.payload).not.toContain("corp-request-id");
  });

  it("cancels an in-flight settings request when the caller aborts", async () => {
    const { entered, fetch, requestSignal } = createAbortableFetch();
    const client = new MonobankCorporateClient({
      fetch,
      keyId: "28a75537175a018645e6f8b14be7681791e701e0",
      sign: () => "c2lnbmF0dXJl",
    });
    const controller = new AbortController();

    const request = client.company.getSettings(
      { requestId: "corp-request-id" },
      { signal: controller.signal },
    );
    request.catch(() => undefined);
    await entered;
    controller.abort();

    expect(requestSignal()?.aborted).toBe(true);
    await expect(request).rejects.toMatchObject({ reason: "aborted" });
  });

  it("rejects a blank request id before reaching Fetch", async () => {
    const fetch = createFetchSequence([jsonResponse(corporateSettingsFixture)]);
    const { client } = createClient(fetch);

    await expect(
      client.company.getSettings({ requestId: " " }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
