import { describe, expect, it } from "vitest";

import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { readBinaryPayload } from "./read-binary-payload.js";

describe("readBinaryPayload", () => {
  it("returns the raw bytes and declared content type", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nfake");
    const response = new Response(bytes, {
      headers: { "Content-Type": "application/pdf" },
    });

    const payload = await readBinaryPayload(
      response,
      "/api/order/guarantee/letter",
    );

    expect(payload.bytes).toEqual(bytes);
    expect(payload.contentType).toBe("application/pdf");
  });

  it("reports an absent content type as undefined", async () => {
    const response = new Response(new TextEncoder().encode("bytes"));

    const payload = await readBinaryPayload(
      response,
      "/api/order/guarantee/letter",
    );

    expect(payload.contentType).toBeUndefined();
  });

  it("rejects an empty successful body", async () => {
    const response = new Response(new Uint8Array());

    await expect(
      readBinaryPayload(response, "/api/order/guarantee/letter"),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });
});
