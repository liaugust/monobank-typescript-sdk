import * as z from "zod/mini";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { Rfc3339TimeInput } from "../../../shared/rfc3339-time.js";
import { normalizeRfc3339Time } from "../../../shared/rfc3339-time.js";

/** Root-relative endpoint importing a monopay button signing key. */
export const importMonopaySigningKeyEndpoint =
  "/api/merchant/monopay/pubkey-import";

/** Input for importing a monopay button signing key. */
export interface ImportMonopaySigningKeyInput {
  /** Optional expiry, documented as a date-time. */
  readonly expiresAt?: Rfc3339TimeInput;
  /** Optional merchant-chosen label for the key. */
  readonly keyName?: string;
  /** Base64-encoded public key value. */
  readonly keyValue: string;
}

interface ImportMonopaySigningKeyBody {
  readonly expiresAt?: string;
  readonly keyName?: string;
  readonly keyValue: string;
}

/** Runtime validator for `POST /api/merchant/monopay/pubkey-import` responses. */
export const importedMonopaySigningKeySchema = z.looseObject({
  result: z.looseObject({
    keyId: z.string(),
  }),
});

/** Identifier Monobank assigned to a newly imported signing key. */
export type ImportedMonopaySigningKey = z.infer<
  typeof importedMonopaySigningKeySchema
>;

/**
 * Validates and builds the monopay key-import JSON body.
 *
 * The thrown error names the offending field without repeating its value, so an
 * imported key never reaches public error state.
 * @param input Key value and optional label and expiry.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When `keyValue` or `keyName` is blank, or `expiresAt` is not a timestamp.
 */
export function createImportMonopaySigningKeyBody(
  input: ImportMonopaySigningKeyInput,
): ImportMonopaySigningKeyBody {
  const issues: string[] = [];
  const keyValue = requireNonEmptyText(input.keyValue, "keyValue", issues);
  const keyName =
    input.keyName === undefined
      ? undefined
      : requireNonEmptyText(input.keyName, "keyName", issues);
  const expiresAt =
    input.expiresAt === undefined
      ? undefined
      : normalizeRfc3339Time(input.expiresAt, "expiresAt", issues);

  if (issues.length > 0 || keyValue === undefined) {
    throw new MonobankValidationError({
      endpoint: importMonopaySigningKeyEndpoint,
      issues,
      message: "Invalid monopay signing-key request.",
    });
  }

  return {
    ...(expiresAt === undefined ? {} : { expiresAt }),
    ...(keyName === undefined ? {} : { keyName }),
    keyValue,
  };
}

function requireNonEmptyText(
  value: string,
  name: "keyName" | "keyValue",
  issues: string[],
): string | undefined {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value
  ) {
    issues.push(
      `${name} must be a nonempty string without surrounding whitespace`,
    );

    return undefined;
  }

  return value;
}
