# @liaugust/monobank-sdk

Private, unofficial TypeScript SDK for the Monobank APIs. This package is not
published to npm yet and is not endorsed by Monobank.

The SDK supports Node.js 20.19.5+ and modern browsers that provide the standard
Fetch API. Until publication is approved, install it only from the private
repository or workspace where it is developed.

## Personal Client

Create a Personal client with a token. The token is sent only to
`/personal/*` endpoints; public `/bank/*` requests do not receive `X-Token`.

```ts
import { MonobankPersonalClient } from "@liaugust/monobank-sdk";

const client = new MonobankPersonalClient({
  token: "personal-token",
});
```

Inject Fetch for tests, proxies, instrumentation, or runtimes that do not use
`globalThis.fetch` directly.

```ts
const client = new MonobankPersonalClient({
  fetch: async (input, init) => await fetch(input, init),
  token: "personal-token",
});
```

## Personal API Examples

Currency rates are public and Monobank may cache them for 5 minutes.

```ts
const rates = await client.getCurrencyRates();
```

Bank synchronization metadata is public and includes server time plus the
public verification key.

```ts
const sync = await client.getBankSync();
```

Client information is authenticated and limited by Monobank to one request per
60 seconds.

```ts
const info = await client.getClientInfo();
```

Statements are authenticated, limited to one request per 60 seconds, and the
requested window must not exceed 2,682,000 seconds. Dates are normalized to Unix
seconds at the request boundary.

```ts
const statements = await client.getStatements({
  account: info.accounts[0].id,
  from: new Date("2026-08-01T00:00:00.000Z"),
  to: new Date("2026-08-16T00:00:00.000Z"),
});
```

Set a webhook with an absolute HTTP(S) URL, or pass an empty string to remove
the configured webhook. Webhook configuration is a mutating request and is
never retried automatically by the SDK.

```ts
await client.setWebhook({
  webHookUrl: "https://example.test/monobank/webhook",
});
```

Parse incoming Personal webhook payloads after your application has read JSON.
Parsing validates the payload shape only; it does not authenticate the sender.

```ts
import { parsePersonalWebhookEvent } from "@liaugust/monobank-sdk";

const event = parsePersonalWebhookEvent(await request.json());
```

## Retries And Cancellation

Automatic retries are disabled by default. When configured, retries apply only
to safe GET requests, honor `Retry-After`, and can be cancelled with
`RequestOptions.signal`. `POST /personal/webhook` is never retried.

```ts
const client = new MonobankPersonalClient({
  retry: {
    initialDelayMs: 250,
    maxAttempts: 3,
    maxDelayMs: 2_000,
  },
  token: "personal-token",
});

const controller = new AbortController();
const info = await client.getClientInfo({ signal: controller.signal });
```

## Errors

All public SDK errors are safe for application diagnostics and avoid retaining
tokens or raw Personal payloads.

```ts
import {
  MonobankApiError,
  MonobankNetworkError,
  MonobankResponseValidationError,
  MonobankValidationError,
} from "@liaugust/monobank-sdk";

try {
  await client.getClientInfo();
} catch (error) {
  if (error instanceof MonobankApiError) {
    console.error(error.status, error.retryAfterMs, error.upstreamMessage);
  } else if (error instanceof MonobankNetworkError) {
    console.error(error.reason);
  } else if (error instanceof MonobankResponseValidationError) {
    console.error(error.endpoint, error.issues);
  } else if (error instanceof MonobankValidationError) {
    console.error(error.endpoint, error.issues);
  } else {
    throw error;
  }
}
```

## Credentials And CI

Pass tokens through application configuration or secret storage; do not hardcode
them in source, tests, issues, logs, or examples. The repository verification
suite uses injected Fetch implementations and must never make live Monobank
calls or require live Personal tokens.

Every exported client, schema, parser, error, options type, and public method
has JSDoc that is preserved in generated declarations for editor IntelliSense.
