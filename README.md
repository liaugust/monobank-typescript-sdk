# @liaugust/monobank-sdk

[![npm version](https://img.shields.io/npm/v/%40liaugust%2Fmonobank-sdk?logo=npm)](https://www.npmjs.com/package/@liaugust/monobank-sdk)
[![CI](https://github.com/liaugust/monobank-typescript-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/liaugust/monobank-typescript-sdk/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A strict, runtime-validated TypeScript SDK for the Monobank API.

It gives applications typed Personal and Acquiring API responses without
trusting the wire: every successful JSON payload crosses a Zod validation
boundary before it reaches your code.

> [!IMPORTANT]
> This is an unofficial community package. It is not developed, sponsored, or
> endorsed by Monobank.

## Why this SDK?

- Runtime validation for successful API responses and webhook payloads
- Strict TypeScript types with preserved JSDoc in published declarations
- ESM, CommonJS, and modern browser-bundler support
- Fetch injection for tests, proxies, observability, and alternative runtimes
- Explicit cancellation, timeouts, and bounded retries for safe GET requests
- Credential-safe errors that do not retain tokens or raw Personal payloads
- Forward-compatible response objects that preserve additive upstream fields

## Requirements

- Node.js 20.19.5 or newer, or a modern browser with the standard Fetch API
- A Monobank Personal API token for `MonobankPersonalClient`
- A Monobank Acquiring token for `MonobankAcquiringClient`

## Installation

```sh
pnpm add @liaugust/monobank-sdk
```

```sh
npm install @liaugust/monobank-sdk
```

## Quick start

```ts
import { AccountType, MonobankPersonalClient } from "@liaugust/monobank-sdk";

const monobank = new MonobankPersonalClient({
  token: process.env.MONOBANK_TOKEN!,
});

const client = await monobank.getClientInfo();
const blackAccounts = client.accounts.filter(
  (account) => account.type === AccountType.Black,
);

const account = blackAccounts[0];
if (account === undefined) {
  throw new Error("No black account is available");
}

const statements = await monobank.getStatements({
  account: account.id,
  from: new Date("2026-08-01T00:00:00.000Z"),
  to: new Date("2026-08-16T00:00:00.000Z"),
});
```

Do not hardcode a real token in source code. Load it from validated application
configuration or a secret manager. The non-null assertion above keeps the
example focused; production code should validate the environment value first.

## API at a glance

| Method                 | Authentication  | Result                     | Notes                                          |
| ---------------------- | --------------- | -------------------------- | ---------------------------------------------- |
| `getBankSync()`        | Public          | `BankSync`                 | Server time and public verification key        |
| `getCurrencyRates()`   | Public          | `readonly CurrencyRate[]`  | Monobank may cache rates for five minutes      |
| `getClientInfo()`      | Personal token  | `ClientInfo`               | Limited upstream to one request per 60 seconds |
| `getStatements(input)` | Personal token  | `readonly StatementItem[]` | Maximum window: 2,682,000 seconds              |
| `setWebhook(input)`    | Personal token  | `void`                     | Mutating request; never retried automatically  |
| `getMerchantDetails()` | Acquiring token | `MerchantDetails`          | Merchant identity for the supplied token       |

See the [complete API reference](docs/API.md) for signatures, parameters,
returns, errors, retry behavior, data models, and focused examples.

The client requires a token at construction because it owns both public and
authenticated Personal methods. The SDK never sends that token to `/bank/*`
endpoints.

### Acquiring merchant details

Use a separate client so Personal and Acquiring credentials cannot be mixed:

```ts
import { MonobankAcquiringClient } from "@liaugust/monobank-sdk";

const acquiring = new MonobankAcquiringClient({
  token: process.env.MONOBANK_ACQUIRING_TOKEN!,
});

const merchant = await acquiring.getMerchantDetails();
console.log(merchant.merchantId, merchant.merchantName, merchant.edrpou);
```

The Acquiring token is sent only to authenticated `/api/merchant/*` methods.

### Public data

```ts
const rates = await monobank.getCurrencyRates();
const synchronization = await monobank.getBankSync();
```

### Client information

```ts
import { CashbackType } from "@liaugust/monobank-sdk";

const info = await monobank.getClientInfo();
const cashbackAccounts = info.accounts.filter(
  (account) => account.cashbackType === CashbackType.UAH,
);
```

`AccountType` and `CashbackType` are importable const objects with corresponding
union types. They provide enum-like values without emitting TypeScript enum
runtime code.

### Statements

```ts
const account = info.accounts[0];

if (account === undefined) {
  throw new Error("No account is available");
}

const statements = await monobank.getStatements({
  account: account.id,
  from: 1_786_060_800,
  to: 1_787_356_800,
});
```

`Date` values are converted to integer Unix seconds. Numeric values must
already be finite, nonnegative Unix-second integers. Omitting `account`
requests Monobank's default account identifier, `0`.

### Webhooks

Set or remove the Personal webhook URL:

```ts
await monobank.setWebhook({
  webHookUrl: "https://example.com/webhooks/monobank",
});

await monobank.setWebhook({ webHookUrl: "" });
```

Validate an incoming JSON body:

```ts
import { parsePersonalWebhookEvent } from "@liaugust/monobank-sdk";

const event = parsePersonalWebhookEvent(await request.json());
```

Parsing validates the documented payload shape. It does **not** authenticate
the sender; verify the delivery channel and any signature material before
acting on a webhook.

## Retries, timeouts, and cancellation

Retries are disabled unless configured. A retry policy applies only to safe
GET requests, respects `Retry-After`, and never retries `setWebhook()`.

```ts
const monobank = new MonobankPersonalClient({
  retry: {
    baseDelayMs: 250,
    maxAttempts: 3,
    maxDelayMs: 2_000,
  },
  timeoutMs: 10_000,
  token: process.env.MONOBANK_TOKEN!,
});

const controller = new AbortController();

const info = await monobank.getClientInfo({
  signal: controller.signal,
});

// Call controller.abort() when the surrounding operation is cancelled.
```

An abort, timeout, or Fetch failure becomes a `MonobankNetworkError` with a
stable `reason` of `"aborted"`, `"timeout"`, or `"network"`.

## Errors

```ts
import {
  MonobankApiError,
  MonobankNetworkError,
  MonobankResponseValidationError,
  MonobankValidationError,
} from "@liaugust/monobank-sdk";

try {
  await monobank.getClientInfo();
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

- `MonobankValidationError` — invalid SDK configuration or method input
- `MonobankNetworkError` — abort, timeout, or network failure before a response
- `MonobankApiError` — non-success HTTP response from Monobank
- `MonobankResponseValidationError` — successful JSON did not match its schema

Public errors retain only bounded diagnostic data. They intentionally exclude
tokens, authorization headers, request objects, and raw API payloads.

## Runtime schemas

The package exports its Zod Mini schemas for applications that need the exact
same validation boundary:

```ts
import {
  clientInfoSchema,
  currencyRatesSchema,
  merchantDetailsSchema,
  personalWebhookEventSchema,
  statementItemsSchema,
} from "@liaugust/monobank-sdk";
```

Monobank response objects use `looseObject`, so documented fields are validated
while unknown additive fields are preserved for forward compatibility.

## Data conventions

- Monetary integers are expressed in the currency's minor units.
- Currency codes are numeric ISO 4217 codes.
- Statement and rate timestamps are Unix seconds.
- `BankSync.serverTimeMsec` is Unix milliseconds.
- Upstream field names, including `webHookUrl`, are preserved.

## Testing applications

Inject a Fetch-compatible function instead of making live banking requests:

```ts
const monobank = new MonobankPersonalClient({
  fetch: async () =>
    new Response(JSON.stringify([]), {
      headers: { "content-type": "application/json" },
      status: 200,
    }),
  token: "synthetic-test-token",
});
```

The SDK repository itself never requires live credentials. Its test suite uses
synthetic fixtures and injected Fetch implementations.

## Project guides

- [API reference](docs/API.md) documents every public method, model, schema,
  value, and error in one place.
- [llms.txt](llms.txt) gives language models a compact package and API map.
- [AGENTS.md](AGENTS.md) defines safe usage and contribution rules for coding
  agents.
- [CONTRIBUTING.md](CONTRIBUTING.md) explains the contributor workflow.
- [SECURITY.md](SECURITY.md) explains private vulnerability reporting.
- [RELEASING.md](RELEASING.md) documents trusted npm publishing.

## License

[MIT](LICENSE)
