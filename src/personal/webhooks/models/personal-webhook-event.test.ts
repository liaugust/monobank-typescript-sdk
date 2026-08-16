import { describe, expect, it } from "vitest";

import { statementItemFixture } from "../../../../tests/fixtures/personal/statements.js";
import { personalWebhookEventFixture } from "../../../../tests/fixtures/personal/webhooks.js";
import { MonobankResponseValidationError } from "../../../errors/monobank-response-validation-error.js";
import {
  parsePersonalWebhookEvent,
  personalWebhookEventSchema,
} from "./personal-webhook-event.js";

describe("personal webhook event schema", () => {
  it("accepts StatementItem webhook events with nested account and statement data", () => {
    expect(
      personalWebhookEventSchema.parse(personalWebhookEventFixture),
    ).toEqual(personalWebhookEventFixture);
    expect(parsePersonalWebhookEvent(personalWebhookEventFixture)).toEqual(
      personalWebhookEventFixture,
    );
  });

  it("rejects webhook events with a non-StatementItem literal type", () => {
    const result = personalWebhookEventSchema.safeParse({
      ...personalWebhookEventFixture,
      type: "InvoiceCreated",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ["type"] })]),
      );
    }
  });

  it("rejects webhook events without a nested account id", () => {
    const result = personalWebhookEventSchema.safeParse({
      ...personalWebhookEventFixture,
      data: {
        statementItem: statementItemFixture,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["data", "account"] }),
        ]),
      );
    }
  });

  it("rejects malformed nested webhook statement data", () => {
    const result = personalWebhookEventSchema.safeParse({
      ...personalWebhookEventFixture,
      data: {
        ...personalWebhookEventFixture.data,
        statementItem: {
          ...statementItemFixture,
          balance: "9987655",
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["data", "statementItem", "balance"],
          }),
        ]),
      );
    }
  });

  it("throws a safe response validation error without retaining the raw webhook input", () => {
    const sensitivePayload = {
      data: {
        account: "account-id",
        statementItem: {
          ...statementItemFixture,
          description: "do-not-retain-this-description",
          time: "1785542400",
        },
      },
      type: "StatementItem",
    };

    expect(() => parsePersonalWebhookEvent(sensitivePayload)).toThrow(
      MonobankResponseValidationError,
    );

    try {
      parsePersonalWebhookEvent(sensitivePayload);
    } catch (error) {
      expect(error).toMatchObject({
        endpoint: "personal-webhook-event",
        name: "MonobankResponseValidationError",
      });
      expect(JSON.stringify(error)).not.toContain(
        "do-not-retain-this-description",
      );
      return;
    }

    throw new Error("Expected parser to reject malformed webhook input");
  });
});
