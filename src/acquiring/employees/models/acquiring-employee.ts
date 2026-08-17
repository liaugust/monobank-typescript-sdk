import * as z from "zod/mini";

/** Runtime validator for one Acquiring employee eligible to receive tips. */
export const acquiringEmployeeSchema = z.looseObject({
  extRef: z.string(),
  id: z.string(),
  name: z.string(),
});

/** One validated Acquiring employee eligible to receive tips. */
export type AcquiringEmployee = z.infer<typeof acquiringEmployeeSchema>;

/** Runtime validator for `GET /api/merchant/employee/list` responses. */
export const acquiringEmployeeListSchema = z.looseObject({
  list: z.array(acquiringEmployeeSchema),
});

/** Validated Acquiring employee-list response. */
export interface AcquiringEmployeeList {
  /** Employees the merchant registered as tip recipients. */
  readonly list: readonly AcquiringEmployee[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
