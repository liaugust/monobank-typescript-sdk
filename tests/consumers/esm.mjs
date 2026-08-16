import assert from "node:assert/strict";

import * as sdk from "../../dist/index.js";

const fetchStub = async () => new Response("{}", { status: 200 });
const client = new sdk.MonobankPersonalClient({
  fetch: fetchStub,
  token: "test-token",
});
const acquiringClient = new sdk.MonobankAcquiringClient({
  fetch: fetchStub,
  token: "test-acquiring-token",
});

for (const exportName of [
  "MonobankAcquiringClient",
  "MonobankApiError",
  "MonobankNetworkError",
  "MonobankPersonalClient",
  "MonobankResponseValidationError",
  "MonobankValidationError",
]) {
  assert.equal(typeof sdk[exportName], "function");
}

assert.ok(client instanceof sdk.MonobankPersonalClient);
assert.ok(acquiringClient instanceof sdk.MonobankAcquiringClient);
