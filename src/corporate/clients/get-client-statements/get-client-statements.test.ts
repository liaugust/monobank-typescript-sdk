import { describe, expect, it, vi } from "vitest";

import { statementItemFixture } from "../../../../tests/fixtures/personal/statements.js";
import { createCorporateTestClient } from "../../../../tests/support/corporate-client.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../../tests/support/fetch-request-inspection.js";
import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { CorporateSigner } from "../../../transport/corporate-signer.js";

describe("clients.getStatements", () => {
  it("signs the full encoded statement path including the window", async () => {
    const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = createCorporateTestClient(fetch, sign);

    const statements = await client.clients.getStatements({
      account: "acc-1",
      from: 1_554_466_347,
      requestId: "grant-1",
      to: 1_554_466_400,
    });

    expect(statements).toEqual([statementItemFixture]);
    expect(firstRequestUrl(fetch).pathname).toBe(
      "/personal/statement/acc-1/1554466347/1554466400",
    );

    const headers = firstRequestHeaders(fetch);
    expect(headers.get("X-Request-Id")).toBe("grant-1");
    expect(sign.mock.calls[0]?.[0]?.payload).toBe(
      `${headers.get("X-Time") ?? ""}grant-1/personal/statement/acc-1/1554466347/1554466400`,
    );
  });

  it("defaults the account and omits an absent window end", async () => {
    const fetch = createFetchSequence([jsonResponse([])]);
    const client = createCorporateTestClient(fetch);

    await client.clients.getStatements({
      from: 1_554_466_347,
      requestId: "grant-1",
    });

    expect(firstRequestUrl(fetch).pathname).toBe(
      "/personal/statement/0/1554466347",
    );
  });

  it("accepts Date inputs as Unix seconds", async () => {
    const fetch = createFetchSequence([jsonResponse([])]);
    const client = createCorporateTestClient(fetch);

    await client.clients.getStatements({
      from: new Date("2026-08-01T00:00:00.000Z"),
      requestId: "grant-1",
    });

    expect(firstRequestUrl(fetch).pathname).toBe(
      "/personal/statement/0/1785542400",
    );
  });

  it.each([
    [
      "a window wider than the documented maximum",
      { from: 0, requestId: "grant-1", to: 2_682_001 },
    ],
    ["a reversed window", { from: 100, requestId: "grant-1", to: 50 }],
    ["an invalid start time", { from: Number.NaN, requestId: "grant-1" }],
    ["a blank account segment", { account: "", from: 0, requestId: "grant-1" }],
    ["a blank request id", { from: 0, requestId: " " }],
  ])("rejects %s before Fetch", async (_label, input) => {
    const fetch = createFetchSequence([jsonResponse([])]);
    const client = createCorporateTestClient(fetch);

    await expect(client.clients.getStatements(input)).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports the corporate message rather than the personal one", async () => {
    const fetch = createFetchSequence([jsonResponse([])]);
    const client = createCorporateTestClient(fetch);

    const rejection = await client.clients
      .getStatements({ from: 100, requestId: "grant-1", to: 50 })
      .catch((error: unknown) => error);

    expect(rejection).toMatchObject({
      message: "Invalid corporate client statement request.",
    });
  });
});
