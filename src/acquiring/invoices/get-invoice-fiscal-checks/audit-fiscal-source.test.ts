import { expect, it } from "vitest";

import {
  FiscalizationSource,
  invoiceFiscalChecksSchema,
} from "./get-invoice-fiscal-checks.js";
it("accepts Vchasno Kasa fiscal checks", () => {
  const response = {
    checks: [
      {
        id: "check-42",
        fiscalizationSource: "vchasnokasa",
        type: "sale",
        status: "done",
      },
    ],
  };
  expect(invoiceFiscalChecksSchema.parse(response)).toEqual(response);
  expect(FiscalizationSource.Vchasnokasa).toBe("vchasnokasa");
});
