import { describe, expect, it, vi } from "vitest";

import { corporateRegistrationStatusFixture } from "../../../../tests/fixtures/corporate/company.js";
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
import {
  CorporateRegistrationStatus,
  corporateRegistrationStatusSchema,
} from "./get-registration-status.js";

describe("corporate registration status schema", () => {
  it("accepts an approved application with its issued key", () => {
    expect(
      corporateRegistrationStatusSchema.parse(
        corporateRegistrationStatusFixture,
      ),
    ).toEqual(corporateRegistrationStatusFixture);
  });

  it.each(Object.values(CorporateRegistrationStatus))(
    "accepts the documented %s status",
    (status) => {
      const payload = { ...corporateRegistrationStatusFixture, status };

      expect(corporateRegistrationStatusSchema.parse(payload)).toEqual(payload);
    },
  );

  it("accepts a pending application that carries no key yet", () => {
    const parsed = corporateRegistrationStatusSchema.parse({ status: "New" });

    expect(parsed.keyId).toBeUndefined();
  });

  it("accepts an undocumented status rather than discarding a valid key", () => {
    const payload = {
      ...corporateRegistrationStatusFixture,
      status: "Pending",
    };

    expect(corporateRegistrationStatusSchema.parse(payload)).toEqual(payload);
  });

  it("rejects malformed status and key types", () => {
    const result = corporateRegistrationStatusSchema.safeParse({
      keyId: 42,
      status: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["keyId"] }),
          expect.objectContaining({ path: ["status"] }),
        ]),
      );
    }
  });
});

describe("company.getRegistrationStatus", () => {
  it("polls the signed status endpoint without a key identifier", async () => {
    const fetch = createFetchSequence([
      jsonResponse(corporateRegistrationStatusFixture),
    ]);
    const sign = vi.fn<CorporateSigner>(() => "c2ln");
    const client = new MonobankCorporateClient({ fetch, sign });

    const status = await client.company.getRegistrationStatus({
      pubkey: "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemow",
    });

    expect(status).toEqual(corporateRegistrationStatusFixture);
    expect(firstRequestUrl(fetch).pathname).toBe(
      "/personal/auth/registration/status",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestBody(fetch)).toEqual({
      pubkey: "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemow",
    });
    const headers = firstRequestHeaders(fetch);
    expect(headers.has("X-Key-Id")).toBe(false);
    expect(headers.get("X-Time")).toMatch(/^\d+$/);
    expect(sign.mock.calls[0]?.[0]?.payload).toBe(
      `${headers.get("X-Time") ?? ""}/personal/auth/registration/status`,
    );
  });

  it("rejects a blank public key before Fetch", async () => {
    const fetch = createFetchSequence([
      jsonResponse(corporateRegistrationStatusFixture),
    ]);
    const client = new MonobankCorporateClient({ fetch, sign: () => "c2ln" });

    await expect(
      client.company.getRegistrationStatus({ pubkey: " " }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
