import { describe, expect, it, vi } from "vitest";

import {
  corporateRegistrationFixture,
  corporateRegistrationInputFixture,
} from "../../../../tests/fixtures/corporate/company.js";
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
import { corporateRegistrationSchema } from "./register.js";

describe("corporate registration schema", () => {
  it("accepts the documented application response", () => {
    expect(
      corporateRegistrationSchema.parse(corporateRegistrationFixture),
    ).toEqual(corporateRegistrationFixture);
  });

  it("accepts an empty response because no field is documented as required", () => {
    expect(corporateRegistrationSchema.safeParse({}).success).toBe(true);
  });
});

describe("company.register", () => {
  it("submits the signed application without a key identifier", async () => {
    const fetch = createFetchSequence([
      jsonResponse(corporateRegistrationFixture),
    ]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = new MonobankCorporateClient({ fetch, sign });

    const registration = await client.company.register(
      corporateRegistrationInputFixture,
    );

    expect(registration).toEqual(corporateRegistrationFixture);
    expect(firstRequestUrl(fetch).pathname).toBe("/personal/auth/registration");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestBody(fetch)).toEqual(corporateRegistrationInputFixture);

    const headers = firstRequestHeaders(fetch);
    expect(headers.has("X-Key-Id")).toBe(false);
    expect(headers.has("X-Request-Id")).toBe(false);
    expect(headers.get("X-Sign")).toBe("c2ln");
    expect(headers.get("X-Time")).toMatch(/^\d+$/);
    expect(sign.mock.calls[0]?.[0]?.payload).toBe(
      `${headers.get("X-Time") ?? ""}/personal/auth/registration`,
    );
  });

  it("rejects an application with a blank required field before Fetch", async () => {
    const fetch = createFetchSequence([
      jsonResponse(corporateRegistrationFixture),
    ]);
    const client = new MonobankCorporateClient({ fetch, sign: () => "c2ln" });

    await expect(
      client.company.register({
        ...corporateRegistrationInputFixture,
        pubkey: "",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
