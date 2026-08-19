import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { createSetWebhookBody } from "./set-webhook.js";

describe("set webhook input validation", () => {
  it("reports the personal endpoint and message on rejection", () => {
    const rejection = (() => {
      try {
        createSetWebhookBody({ webHookUrl: "mono/webhook" });
      } catch (error: unknown) {
        return error;
      }

      throw new Error("Expected the invalid URL to be rejected");
    })();

    expect(rejection).toMatchObject({
      endpoint: "/personal/webhook",
      message: "Invalid Personal webhook request.",
    });
  });

  it("accepts absolute HTTP and HTTPS webhook URLs", () => {
    expect(
      createSetWebhookBody({ webHookUrl: "https://example.test/mono" }),
    ).toEqual({ webHookUrl: "https://example.test/mono" });
    expect(
      createSetWebhookBody({ webHookUrl: "http://localhost:3000/mono" }),
    ).toEqual({ webHookUrl: "http://localhost:3000/mono" });
  });

  it("accepts an empty webhook URL to remove the configured webhook", () => {
    expect(createSetWebhookBody({ webHookUrl: "" })).toEqual({
      webHookUrl: "",
    });
  });

  it("rejects relative and non-HTTP webhook URLs before Fetch", () => {
    expect(() => createSetWebhookBody({ webHookUrl: "/mono" })).toThrow(
      MonobankValidationError,
    );
    expect(() =>
      createSetWebhookBody({ webHookUrl: "ftp://example.test/mono" }),
    ).toThrow(MonobankValidationError);
  });
});
