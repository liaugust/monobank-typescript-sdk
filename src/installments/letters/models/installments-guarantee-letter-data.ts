import * as z from "zod/mini";

/**
 * Runtime validator for one identity document on a guarantee letter.
 *
 * Every field is optional because Monobank documents this response with a sample
 * rather than a schema, and the four document kinds share overlapping fields:
 * `series` is absent from an ID card while `valid_until` and `registry_number`
 * are absent from a passport.
 *
 * These are government identity-document numbers. Never log, persist outside
 * secured storage, or forward them anywhere the guarantee letter itself does not
 * require.
 */
export const installmentsIdentityDocumentSchema = z.looseObject({
  date_of_issue: z.optional(z.string()),
  issued: z.optional(z.string()),
  number: z.optional(z.string()),
  registry_number: z.optional(z.string()),
  series: z.optional(z.string()),
  valid_until: z.optional(z.string()),
});

/** One validated identity document referenced by a guarantee letter. */
export type InstallmentsIdentityDocument = z.infer<
  typeof installmentsIdentityDocumentSchema
>;

/**
 * Runtime validator for the customer block of a guarantee letter.
 *
 * This is the most sensitive payload the SDK carries: a full name, a tax
 * identifier, and up to four identity documents. Treat the whole block as
 * personal data under the caller's own retention rules.
 */
export const installmentsLetterCustomerSchema = z.looseObject({
  document: z.optional(
    z.looseObject({
      id_card: z.optional(installmentsIdentityDocumentSchema),
      international_passport: z.optional(installmentsIdentityDocumentSchema),
      passport: z.optional(installmentsIdentityDocumentSchema),
      residence_permit: z.optional(installmentsIdentityDocumentSchema),
    }),
  ),
  first_name: z.optional(z.string()),
  inn: z.optional(z.string()),
  last_name: z.optional(z.string()),
  middle_name: z.optional(z.string()),
});

/** Validated customer identity block of a guarantee letter. */
export type InstallmentsLetterCustomer = z.infer<
  typeof installmentsLetterCustomerSchema
>;

/**
 * Runtime validator for guarantee-letter source data.
 *
 * Shared by `letters.getData()` and `letters.getDataV2()`. Monobank documents both
 * with the same structure, the v2 header simply carrying `contract_number` and
 * `contract_date` as well, so one loose schema covers both rather than two that
 * would drift. Every field is optional because the documentation is a sample.
 *
 * Amounts here are hryvnia, and `answer_datetime` is explicitly `null` until set.
 * `sign` and `stamp` are the bank's signature and stamp values for the letter.
 */
export const installmentsGuaranteeLetterDataSchema = z.looseObject({
  expansion: z.optional(
    z.looseObject({
      bank: z.optional(
        z.looseObject({
          agreement: z.optional(z.string()),
          agreement_date: z.optional(z.string()),
          available_parts_count: z.optional(z.int()),
          bank_executive: z.optional(z.string()),
          bank_id: z.optional(z.string()),
          bank_name: z.optional(z.string()),
          credit_amount: z.optional(z.number()),
          credit_product: z.optional(z.string()),
          customer_pay_amount: z.optional(z.number()),
          product_types: z.optional(z.string()),
        }),
      ),
      customer: z.optional(installmentsLetterCustomerSchema),
      invoice: z.optional(
        z.looseObject({
          invoice_amount: z.optional(z.number()),
          invoice_date: z.optional(z.string()),
          invoice_number: z.optional(z.string()),
        }),
      ),
      payment_destination: z.optional(
        z.looseObject({
          dest_acc_number: z.optional(z.string()),
          dest_bank_name: z.optional(z.string()),
          dest_id: z.optional(z.string()),
          dest_mfo: z.optional(z.string()),
          dest_name: z.optional(z.string()),
        }),
      ),
      sign: z.optional(z.string()),
      stamp: z.optional(z.string()),
    }),
  ),
  header: z.optional(
    z.looseObject({
      answer_datetime: z.optional(z.nullable(z.string())),
      contract_date: z.optional(z.string()),
      contract_number: z.optional(z.string()),
      from_organization: z.optional(z.string()),
      organization_id: z.optional(z.string()),
      request_id: z.optional(z.string()),
    }),
  ),
});

/** Validated source data behind a guarantee letter. */
export type InstallmentsGuaranteeLetterData = z.infer<
  typeof installmentsGuaranteeLetterDataSchema
>;
