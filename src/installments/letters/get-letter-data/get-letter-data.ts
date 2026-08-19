import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";
import { invalidInstallmentsRequestMessage } from "../../shared/request-validation.js";

/** Root-relative endpoint returning guarantee-letter source data. */
export const getInstallmentsLetterDataEndpoint =
  "/api/order/data/for/guarantee/letter";

/** Root-relative v2 endpoint returning guarantee-letter source data. */
export const getInstallmentsLetterDataV2Endpoint =
  "/api/v2/order/data/for/guarantee/letter";

/** Root-relative endpoint returning the guarantee letter itself as a document. */
export const downloadInstallmentsLetterEndpoint = "/api/order/guarantee/letter";

const orderIdentifierPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const installmentsLetterRequestSchema = z.looseObject({
  invoice: z.optional(z.looseObject({})),
  order_id: z
    .string()
    .check(z.refine((value) => orderIdentifierPattern.test(value))),
});

type InstallmentsLetterRequestBody = z.output<
  typeof installmentsLetterRequestSchema
>;

/** Input identifying the order a guarantee letter is requested for. */
export interface InstallmentsLetterInput {
  /**
   * Optional invoice the letter should reference.
   *
   * Documented by sample as `number` and `date`; unknown keys are forwarded
   * rather than dropped, because Monobank publishes no schema for the object.
   */
  readonly invoice?: Readonly<Record<string, unknown>>;
  /** Order the letter is requested for, as a UUID. */
  readonly order_id: string;
}

/**
 * Validates and builds a guarantee-letter request body.
 * @param input Order identifier and optional invoice reference.
 * @param endpoint Endpoint receiving the validated body.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When `order_id` is not a UUID.
 */
export function createInstallmentsLetterBody(
  input: InstallmentsLetterInput,
  endpoint: string,
): InstallmentsLetterRequestBody {
  return parseMonobankRequest(
    installmentsLetterRequestSchema,
    input,
    endpoint,
    invalidInstallmentsRequestMessage,
  );
}
