# @liaugust/monobank-sdk

[![npm version](https://img.shields.io/npm/v/%40liaugust%2Fmonobank-sdk?logo=npm)](https://www.npmjs.com/package/@liaugust/monobank-sdk)
[![CI](https://github.com/liaugust/monobank-typescript-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/liaugust/monobank-typescript-sdk/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A strict, runtime-validated TypeScript SDK for the Monobank API.

It gives applications typed Public, Personal, and Acquiring API responses
without trusting the wire: every successful JSON payload crosses a Zod
validation boundary before it reaches your code.

> [!IMPORTANT]
> This is an unofficial community package. It is not developed, sponsored, or
> endorsed by Monobank.

## Why this SDK?

- Runtime validation for successful API responses and webhook payloads
- Strict TypeScript types with preserved JSDoc in published declarations
- ESM, CommonJS, and modern browser-bundler support
- Built-in Web Crypto authentication for Acquiring webhook signatures
- Fetch injection for tests, proxies, observability, and alternative runtimes
- Explicit cancellation, timeouts, and bounded retries for safe GET requests
- Credential-safe errors that do not retain tokens or raw Personal payloads
- Forward-compatible response objects that preserve additive upstream fields

## Requirements

- Node.js 20.19.5 or newer, or a modern browser with standard Fetch and Web Crypto
- No token for `MonobankPublicClient`
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

const info = await monobank.client.getInfo();
const blackAccounts = info.accounts.filter(
  (account) => account.type === AccountType.Black,
);

const account = blackAccounts[0];
if (account === undefined) {
  throw new Error("No black account is available");
}

const statements = await monobank.statements.get({
  account: account.id,
  from: new Date("2026-08-01T00:00:00.000Z"),
  to: new Date("2026-08-16T00:00:00.000Z"),
});
```

Do not hardcode a real token in source code. Load it from validated application
configuration or a secret manager. The non-null assertion above keeps the
example focused; production code should validate the environment value first.

## API at a glance

| Call                                        | Authentication  | Result                      | Notes                                          |
| ------------------------------------------- | --------------- | --------------------------- | ---------------------------------------------- |
| `publicApi.bank.getSync()`                  | None            | `BankSync`                  | Server time and public verification key        |
| `publicApi.currency.getRates()`             | None            | `readonly CurrencyRate[]`   | Monobank may cache rates for five minutes      |
| `personal.client.getInfo()`                 | Personal token  | `ClientInfo`                | Limited upstream to one request per 60 seconds |
| `personal.statements.get(input)`            | Personal token  | `readonly StatementItem[]`  | Maximum window: 2,682,000 seconds              |
| `personal.webhooks.set(input)`              | Personal token  | `void`                      | Mutating request; never retried automatically  |
| `acquiring.merchant.getDetails()`           | Acquiring token | `MerchantDetails`           | Merchant identity for the supplied token       |
| `acquiring.statements.get(input)`           | Acquiring token | `AcquiringStatement`        | Transaction statement ordered newest first     |
| `acquiring.submerchants.list()`             | Acquiring token | `AcquiringSubmerchantList`  | Terminals available to supported merchants     |
| `acquiring.webhooks.getPublicKey()`         | Acquiring token | `AcquiringWebhookPublicKey` | Key used to authenticate webhook signatures    |
| `acquiring.invoices.create(input)`          | Acquiring token | `NewInvoice`                | Creates a hosted payment page                  |
| `acquiring.invoices.getStatus(input)`       | Acquiring token | `Invoice`                   | Safe GET; eligible for configured retries      |
| `acquiring.invoices.cancel(input)`          | Acquiring token | `InvoiceCancellation`       | Full or partial cancellation                   |
| `acquiring.invoices.remove(input)`          | Acquiring token | `void`                      | Invalidates an unpaid invoice                  |
| `acquiring.invoices.finalize(input)`        | Acquiring token | `InvoiceFinalization`       | Captures a held payment                        |
| `acquiring.invoices.getReceipt(input)`      | Acquiring token | `InvoiceReceipt`            | Gets and optionally emails a receipt           |
| `acquiring.invoices.getFiscalChecks(input)` | Acquiring token | `InvoiceFiscalChecks`       | Loads fiscalization results                    |

See the [complete API reference](docs/API.md) for signatures, parameters,
returns, errors, retry behavior, data models, and focused examples.

Each client represents one credential boundary. Public calls use a token-free
client; Personal and Acquiring tokens cannot accidentally cross API families.

### Acquiring merchant details

Use a separate client so Personal and Acquiring credentials cannot be mixed:

```ts
import { MonobankAcquiringClient } from "@liaugust/monobank-sdk";

const acquiring = new MonobankAcquiringClient({
  token: process.env.MONOBANK_ACQUIRING_TOKEN!,
});

const merchant = await acquiring.merchant.getDetails();
console.log(merchant.merchantId, merchant.merchantName, merchant.edrpou);
```

The Acquiring token is sent only to authenticated `/api/merchant/*` methods.

### Acquiring submerchants

Merchants enabled for marketplace or agent integrations can load the terminal
codes accepted by invoice creation and statement filtering:

```ts
const submerchants = await acquiring.submerchants.list();

for (const submerchant of submerchants.list) {
  console.log(submerchant.code, submerchant.iban);
}
```

The response list is readonly. Every item has a terminal `code` and owner
`iban`; `edrpou` and `owner` are optional because Monobank may omit them.

### Acquiring statements

Load transactions for a Unix-second time window, optionally scoped to a
submerchant terminal:

```ts
import {
  AcquiringPaymentScheme,
  AcquiringStatementStatus,
} from "@liaugust/monobank-sdk";

const statement = await acquiring.statements.get({
  code: "terminal-42",
  from: new Date("2026-08-01T00:00:00.000Z"),
  to: new Date("2026-08-16T00:00:00.000Z"),
});

const successfulFullPayments = statement.list.filter(
  (item) =>
    item.status === AcquiringStatementStatus.Success &&
    item.paymentScheme === AcquiringPaymentScheme.Full,
);
```

`statement.list` is readonly and ordered newest first. Monetary values use
minor currency units; transaction and cancellation `date` fields are RFC-3339
strings. The method is a safe GET eligible for configured retries.

Create a debit invoice and inspect its status:

```ts
import { InvoiceStatus, MonobankAcquiringClient } from "@liaugust/monobank-sdk";

const acquiring = new MonobankAcquiringClient({
  token: process.env.MONOBANK_ACQUIRING_TOKEN!,
});

const created = await acquiring.invoices.create(
  {
    amount: 4_200,
    merchantPaymInfo: {
      destination: "Order 42",
      reference: "order-42",
    },
    redirectUrl: "https://example.com/orders/42",
    webHookUrl: "https://example.com/webhooks/monobank",
  },
  {
    cms: "Synthetic Shop",
    cmsVersion: "1.2.3",
  },
);

const invoice = await acquiring.invoices.getStatus({
  invoiceId: created.invoiceId,
});

if (invoice.status === InvoiceStatus.Success) {
  console.log("Paid", invoice.finalAmount);
}
```

Monetary amounts are integer minor units. Use `paymentType: "hold"` (or
`InvoicePaymentType.Hold`) only when your application will later call
`acquiring.invoices.finalize()` or `acquiring.invoices.cancel()`. Invoice
mutations are never retried automatically.

### Public data

```ts
import { MonobankPublicClient } from "@liaugust/monobank-sdk";

const publicApi = new MonobankPublicClient();
const rates = await publicApi.currency.getRates();
const synchronization = await publicApi.bank.getSync();
```

### Client information

```ts
import { CashbackType } from "@liaugust/monobank-sdk";

const info = await monobank.client.getInfo();
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

const statements = await monobank.statements.get({
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
await monobank.webhooks.set({
  webHookUrl: "https://example.com/webhooks/monobank",
});

await monobank.webhooks.set({ webHookUrl: "" });
```

Validate an incoming JSON body:

```ts
import { parsePersonalWebhookEvent } from "@liaugust/monobank-sdk";

const event = parsePersonalWebhookEvent(await request.json());
```

Parsing validates the documented payload shape. It does **not** authenticate
the sender; verify the delivery channel and any signature material before
acting on a webhook.

Authenticate an Acquiring webhook before parsing or acting on it:

```ts
import {
  MonobankAcquiringClient,
  verifyAcquiringWebhookSignature,
} from "@liaugust/monobank-sdk";

const acquiring = new MonobankAcquiringClient({
  token: process.env.MONOBANK_ACQUIRING_TOKEN!,
});

// Cache this response in application infrastructure.
const { key: publicKey } = await acquiring.webhooks.getPublicKey();

const signature = request.headers.get("X-Sign");
if (signature === null) {
  throw new Error("Missing Monobank X-Sign header");
}

const body = await request.arrayBuffer();
const trusted = await verifyAcquiringWebhookSignature({
  body,
  publicKey,
  signature,
});

if (!trusted) {
  throw new Error("Untrusted Monobank webhook");
}

const event = JSON.parse(new TextDecoder().decode(body));
```

The signature covers the exact request bytes. Read the body once and do not
parse, reserialize, trim, or otherwise transform it before verification.
Monobank recommends caching the public key and fetching it again only after
verification with the cached key fails; cache ownership remains with the
application so storage and refresh policy stay explicit.

## Retries, timeouts, and cancellation

Retries are disabled unless configured. A retry policy applies only to safe
GET requests, respects `Retry-After`, and never retries `webhooks.set()`.

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

const info = await monobank.client.getInfo({
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
  await monobank.client.getInfo();
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
  acquiringStatementItemSchema,
  acquiringStatementSchema,
  acquiringSubmerchantListSchema,
  acquiringSubmerchantSchema,
  acquiringWebhookPublicKeySchema,
  clientInfoSchema,
  currencyRatesSchema,
  invoiceStatusSchema,
  merchantDetailsSchema,
  newInvoiceSchema,
  personalWebhookEventSchema,
  statementItemsSchema,
} from "@liaugust/monobank-sdk";
```

Monobank response objects use `looseObject`, so documented fields are validated
while unknown additive fields are preserved for forward compatibility.

## Data conventions

- Monetary integers are expressed in the currency's minor units.
- Currency codes are numeric ISO 4217 codes.
- Rate and Personal statement timestamps are Unix seconds. Acquiring statement
  request inputs use Unix seconds and response dates use RFC-3339.
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
