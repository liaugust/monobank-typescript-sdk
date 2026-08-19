import * as z from "zod/mini";

/**
 * Runtime validator for the paging block returned with subscription reads.
 *
 * Monobank publishes a response sample rather than a schema for these
 * endpoints, so every counter is optional: a response that omits paging must
 * still validate instead of failing the whole read.
 */
export const acquiringSubscriptionPaginationSchema = z.looseObject({
  currentPage: z.optional(z.int()),
  itemsPerPage: z.optional(z.int()),
  totalItems: z.optional(z.int()),
  totalPages: z.optional(z.int()),
});

/** Validated paging counters describing one page of subscription results. */
export type AcquiringSubscriptionPagination = z.infer<
  typeof acquiringSubscriptionPaginationSchema
>;
