import { describe, expect, it, vi } from "vitest";

import {
  documentSigningInputFixture,
  documentSigningRequestFixture,
  documentSigningStatusFixture,
} from "../../../tests/fixtures/corporate/documents.js";
import { expectCorporateCancellation } from "../../../tests/support/caller-cancellation.js";
import { createCorporateTestClient } from "../../../tests/support/corporate-client.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestBody,
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import type { CorporateSigner } from "../../transport/corporate-signer.js";
import type { MonobankCorporateClient } from "../client/monobank-corporate-client.js";
import { DocumentSigningState } from "./models/signing-document.js";

describe("documents.requestSigning", () => {
  it("submits the documents and returns the signatory deeplink", async () => {
    const fetch = createFetchSequence([
      jsonResponse(documentSigningRequestFixture),
    ]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = createCorporateTestClient(fetch, sign);

    const created = await client.documents.requestSigning(
      documentSigningInputFixture,
    );

    expect(created).toEqual(documentSigningRequestFixture);
    expect(firstRequestUrl(fetch).pathname).toBe("/personal/signature/create");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestBody(fetch)).toEqual(documentSigningInputFixture);
    expect(sign.mock.calls[0]?.[0]?.payload).toBe(
      `${firstRequestHeaders(fetch).get("X-Time") ?? ""}/personal/signature/create`,
    );
  });

  it("accepts an absolute HTTP(S) callbackUrl", async () => {
    const fetch = createFetchSequence([
      jsonResponse(documentSigningRequestFixture),
    ]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.documents.requestSigning({
        ...documentSigningInputFixture,
        callbackUrl: "https://shop.example.test/monokep-callback",
      }),
    ).resolves.toEqual(documentSigningRequestFixture);
    expect(firstRequestBody(fetch)).toEqual({
      ...documentSigningInputFixture,
      callbackUrl: "https://shop.example.test/monokep-callback",
    });
  });

  it("rejects a callbackUrl that is not an absolute HTTP(S) URL", async () => {
    const fetch = createFetchSequence([
      jsonResponse(documentSigningRequestFixture),
    ]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.documents.requestSigning({
        ...documentSigningInputFixture,
        callbackUrl: "not-a-url",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is never retried because it creates signing state", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ message: "server error" }, { status: 500 }),
    ]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.documents.requestSigning(documentSigningInputFixture),
    ).rejects.toMatchObject({ status: 500 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an empty document list", { documents: [] }],
    [
      "more than ten documents",
      {
        documents: Array.from({ length: 11 }, () => ({
          hash: "A421FD",
          name: "Договір",
        })),
      },
    ],
    [
      "a document without a hash",
      { documents: [{ hash: " ", name: "Договір" }] },
    ],
    [
      "an undocumented document type",
      {
        documents: [{ hash: "A421FD", name: "Договір", type: "rtf" }],
      },
    ],
  ])("rejects %s before Fetch", async (_label, input) => {
    const fetch = createFetchSequence([
      jsonResponse(documentSigningRequestFixture),
    ]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.documents.requestSigning(
        input as unknown as typeof documentSigningInputFixture,
      ),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("documents.getSigningStatus", () => {
  it("signs the encoded request identifier carried in the query", async () => {
    const fetch = createFetchSequence([
      jsonResponse(documentSigningStatusFixture),
    ]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = createCorporateTestClient(fetch, sign);

    const status = await client.documents.getSigningStatus({
      requestId: "sGtN4FnxYORZQU5Me1HbYhQ",
    });

    expect(status).toEqual(documentSigningStatusFixture);
    expect(status.documents?.[0]?.status).toBe(DocumentSigningState.Signed);
    expect(firstRequestUrl(fetch).search).toBe(
      "?requestId=sGtN4FnxYORZQU5Me1HbYhQ",
    );
    expect(sign.mock.calls[0]?.[0]?.payload).toBe(
      `${firstRequestHeaders(fetch).get("X-Time") ?? ""}/personal/signature/status?requestId=sGtN4FnxYORZQU5Me1HbYhQ`,
    );
  });

  it("accepts a request that has no documents yet", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createCorporateTestClient(fetch);

    const status = await client.documents.getSigningStatus({
      requestId: "req-1",
    });

    expect(status.documents).toBeUndefined();
  });

  it("rejects an undocumented signing state", async () => {
    const fetch = createFetchSequence([
      jsonResponse({
        documents: [{ hash: "A4", name: "D", status: "review" }],
      }),
    ]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.documents.getSigningStatus({ requestId: "req-1" }),
    ).rejects.toMatchObject({ name: "MonobankResponseValidationError" });
  });

  it("rejects a signatory missing a required field", async () => {
    const fetch = createFetchSequence([
      jsonResponse({
        documents: [
          {
            hash: "A4",
            name: "D",
            signers: [
              {
                certSerial: "382367105294AF970400000058B38300BAE33C02",
                date: "2025-01-21T18:15:00.000Z",
                name: "Шевченко Роман Петрович",
                signature: "MIIJQwIBADANBgkqhkiG9w0BAQEFAASCCS0wggkp",
                // tin is required by documentSignatorySchema but omitted here.
              },
            ],
            status: "signed",
          },
        ],
      }),
    ]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.documents.getSigningStatus({ requestId: "req-1" }),
    ).rejects.toMatchObject({ name: "MonobankResponseValidationError" });
  });
});

describe("documents.cancelSigning", () => {
  it("cancels over HTTP DELETE and is never retried", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.documents.cancelSigning({ requestId: "sGtN4FnxYORZQU5Me1HbYhQ" }),
    ).resolves.toBeUndefined();

    expect(fetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(firstRequestUrl(fetch).pathname).toBe("/personal/signature/cancel");
    expect(firstRequestUrl(fetch).search).toBe(
      "?requestId=sGtN4FnxYORZQU5Me1HbYhQ",
    );
  });

  it.each([
    ["an empty identifier", ""],
    ["an injecting identifier", "req\r\nX-Token: x"],
  ])("rejects %s before Fetch", async (_label, requestId) => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createCorporateTestClient(fetch);

    await expect(
      client.documents.cancelSigning({ requestId }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("monoKEP cancellation", () => {
  it.each([
    {
      name: "'signing request'",
      start: (client: MonobankCorporateClient, signal: AbortSignal) =>
        client.documents.requestSigning(documentSigningInputFixture, {
          signal,
        }),
    },
    {
      name: "'signing status'",
      start: (client: MonobankCorporateClient, signal: AbortSignal) =>
        client.documents.getSigningStatus({ requestId: "req-1" }, { signal }),
    },
    {
      name: "'signing cancellation'",
      start: (client: MonobankCorporateClient, signal: AbortSignal) =>
        client.documents.cancelSigning({ requestId: "req-1" }, { signal }),
    },
  ])("passes caller cancellation to the $name request", async ({ start }) => {
    await expectCorporateCancellation(start);
  });
});
