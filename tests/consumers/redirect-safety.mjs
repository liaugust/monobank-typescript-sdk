import assert from "node:assert/strict";
import { createServer } from "node:http";

import {
  MonobankAcquiringClient,
  MonobankNetworkError,
  MonobankPersonalClient,
} from "../../dist/index.js";

const token = "synthetic-redirect-probe-token";
const unvalidatedRequests = [];

const unvalidatedOrigin = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    unvalidatedRequests.push({
      body,
      method: request.method,
      token: request.headers["x-token"] ?? null,
    });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end("{}");
  });
});

await new Promise((resolve) =>
  unvalidatedOrigin.listen(0, "127.0.0.1", resolve),
);

const redirectingOrigin = createServer((_request, response) => {
  response.writeHead(307, {
    Location: `http://127.0.0.1:${unvalidatedOrigin.address().port}/stolen`,
  });
  response.end();
});

await new Promise((resolve) =>
  redirectingOrigin.listen(0, "127.0.0.1", resolve),
);

const baseUrl = `http://127.0.0.1:${redirectingOrigin.address().port}`;

async function expectBlockedRedirect(label, start) {
  let rejection;

  try {
    await start();
  } catch (error) {
    rejection = error;
  }

  assert.deepEqual(
    unvalidatedRequests,
    [],
    `${label} leaked to the unvalidated origin: ${JSON.stringify(unvalidatedRequests)}`,
  );
  assert.ok(
    rejection,
    `${label} should reject instead of following a redirect`,
  );
  assert.ok(
    rejection instanceof MonobankNetworkError,
    `${label} should reject with MonobankNetworkError, got ${rejection?.constructor.name}`,
  );
  assert.equal(rejection.reason, "network", `${label} reason`);
  assert.ok(
    !JSON.stringify({
      message: rejection.message,
      own: { ...rejection },
      stack: rejection.stack,
    }).includes(token),
    `${label} must not retain the token in public error state`,
  );
}

await expectBlockedRedirect("Personal GET", () =>
  new MonobankPersonalClient({ baseUrl, token }).client.getInfo(),
);
await expectBlockedRedirect("Acquiring mutating POST", () =>
  new MonobankAcquiringClient({ baseUrl, token }).qr.resetAmount({
    qrId: "XJ_DiM4rTd5V",
  }),
);

unvalidatedOrigin.close();
redirectingOrigin.close();
