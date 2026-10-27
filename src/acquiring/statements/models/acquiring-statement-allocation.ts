import * as z from "zod/mini";

/** Runtime validator for a receiver allocation; amounts and fees are minor units. */
export const acquiringStatementAllocationSchema = z.looseObject({
  agentFee: z.optional(z.int()),
  amount: z.int(),
  profit: z.int(),
  splitReceiverId: z.string(),
});

/** Validated split-payment allocation for one receiver. */
export type AcquiringStatementAllocation = z.infer<
  typeof acquiringStatementAllocationSchema
>;
