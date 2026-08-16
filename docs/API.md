# API Reference

Complete public API reference for `@liaugust/monobank-sdk`.

The package has one root entry point. Import public clients, values, schemas,
errors, and types from `@liaugust/monobank-sdk`; internal file paths are not a
supported contract.

## Contents

- [Shared conventions](#shared-conventions)
- [MonobankPublicClient](#monobankpublicclient)
- [MonobankPersonalClient](#monobankpersonalclient)
- [MonobankAcquiringClient](#monobankacquiringclient)
- [acquiring.webhooks.getPublicKey](#acquiringwebhooksgetpublickey)
- [verifyAcquiringWebhookSignature](#verifyacquiringwebhooksignature)
- [merchant.getDetails](#merchantgetdetails)
- [acquiring.submerchants.list](#acquiringsubmerchantslist)
- [acquiring.qr.list](#acquiringqrlist)
- [acquiring.qr.getDetails](#acquiringqrgetdetails)
- [acquiring.qr.resetAmount](#acquiringqrresetamount)
- [acquiring.statements.get](#acquiringstatementsget)
- [invoices.create](#invoicescreate)
- [invoices.getStatus](#invoicesgetstatus)
- [invoices.cancel](#invoicescancel)
- [invoices.remove](#invoicesremove)
- [invoices.finalize](#invoicesfinalize)
- [invoices.getReceipt](#invoicesgetreceipt)
- [invoices.getFiscalChecks](#invoicesgetfiscalchecks)
- [bank.getSync](#bankgetsync)
- [currency.getRates](#currencygetrates)
- [client.getInfo](#clientgetinfo)
- [statements.get](#statementsget)
- [webhooks.set](#webhooksset)
- [parsePersonalWebhookEvent](#parsepersonalwebhookevent)
- [Errors](#errors)
- [Runtime schemas](#runtime-schemas)
- [Enum-like values](#enum-like-values)
- [Response models](#response-models)
- [Supporting types](#supporting-types)

## Shared conventions

- Monetary integers use the currency's minor units.
- Currency codes are numeric ISO 4217 codes.
- Rate and Personal statement timestamps are Unix seconds. Acquiring statement
  request inputs use Unix seconds and response dates use RFC-3339.
- `BankSync.serverTimeMsec` is Unix milliseconds.
- Successful JSON responses are parsed through Zod Mini schemas.
- Response objects preserve unknown additive fields from Monobank.
- A Personal token is sent only to authenticated `/personal/*` endpoints, and
  an Acquiring token is sent only to authenticated `/api/merchant/*` endpoints.
- Public `/bank/*` calls use `MonobankPublicClient`, which has no token option.
- Optional request controls use `RequestOptions`, whose only field is
  `signal?: AbortSignal`.

## MonobankPublicClient

```ts
new MonobankPublicClient(options?: MonobankPublicClientOptions)
```

The Public client exposes token-free `/bank/*` endpoints. It cannot retain or
send a Personal or Acquiring token because its constructor has no token option.

Its optional `baseUrl`, `fetch`, `timeoutMs`, and `retry` settings have the same
contracts and defaults as the authenticated clients.

```ts
import { MonobankPublicClient } from "@liaugust/monobank-sdk";

const publicApi = new MonobankPublicClient({
  retry: {
    baseDelayMs: 250,
    maxAttempts: 3,
    maxDelayMs: 2_000,
  },
});
```

## MonobankPersonalClient

```ts
new MonobankPersonalClient(options: MonobankPersonalClientOptions)
```

The Personal client groups authenticated `/personal/*` operations under
`client`, `statements`, and `webhooks` resources. Its validated token is never
used for Public or Acquiring requests.

### Constructor options

| Option      | Type           | Default                   | Contract                                                            |
| ----------- | -------------- | ------------------------- | ------------------------------------------------------------------- |
| `token`     | `string`       | Required                  | Nonempty and without surrounding whitespace                         |
| `baseUrl`   | `string`       | `https://api.monobank.ua` | Absolute HTTP(S) origin, primarily for controlled proxies and tests |
| `fetch`     | `FetchLike`    | `globalThis.fetch`        | Required when the runtime does not provide global Fetch             |
| `timeoutMs` | `number`       | `10_000`                  | Positive finite per-attempt timeout in milliseconds                 |
| `retry`     | `RetryOptions` | Disabled                  | Bounded policy for retry-eligible safe GET requests                 |

Invalid constructor configuration throws `MonobankValidationError` before a
request is made.

```ts
import { MonobankPersonalClient } from "@liaugust/monobank-sdk";

const client = new MonobankPersonalClient({
  retry: {
    baseDelayMs: 250,
    maxAttempts: 3,
    maxDelayMs: 2_000,
  },
  timeoutMs: 10_000,
  token: "validated-personal-token",
});
```

### Retry behavior

`RetryOptions` contains:

| Field         | Type     | Meaning                                               |
| ------------- | -------- | ----------------------------------------------------- |
| `baseDelayMs` | `number` | Positive finite initial exponential-backoff delay     |
| `maxAttempts` | `number` | Positive integer including the first request          |
| `maxDelayMs`  | `number` | Positive finite delay ceiling, at least `baseDelayMs` |

Retries are disabled when `retry` is omitted. When enabled, the SDK retries
only methods marked as safe GET requests and only for:

- network failures classified with reason `"network"`
- HTTP `429`, `500`, `502`, `503`, and `504`

Caller aborts and per-attempt timeouts are not retried. A valid `Retry-After`
value takes precedence over exponential backoff; if it exceeds `maxDelayMs`,
the request fails without another attempt. Mutating methods are never retried,
including `personal.webhooks.set()`, every `acquiring.invoices` mutation, and
`acquiring.qr.resetAmount()`.

## MonobankAcquiringClient

```ts
new MonobankAcquiringClient(options: MonobankAcquiringClientOptions)
```

The Acquiring client is separate from `MonobankPersonalClient` so credentials
cannot cross API families. Its token is attached only to authenticated
`/api/merchant/*` requests.

### Constructor options

| Option      | Type           | Default                   | Contract                                                            |
| ----------- | -------------- | ------------------------- | ------------------------------------------------------------------- |
| `token`     | `string`       | Required                  | Nonempty Acquiring token without surrounding whitespace             |
| `baseUrl`   | `string`       | `https://api.monobank.ua` | Absolute HTTP(S) origin, primarily for controlled proxies and tests |
| `fetch`     | `FetchLike`    | `globalThis.fetch`        | Required when the runtime does not provide global Fetch             |
| `timeoutMs` | `number`       | `10_000`                  | Positive finite per-attempt timeout in milliseconds                 |
| `retry`     | `RetryOptions` | Disabled                  | Bounded policy for retry-eligible safe GET requests                 |

Invalid constructor configuration throws `MonobankValidationError` before a
request is made.

```ts
import { MonobankAcquiringClient } from "@liaugust/monobank-sdk";

const acquiring = new MonobankAcquiringClient({
  retry: {
    baseDelayMs: 250,
    maxAttempts: 3,
    maxDelayMs: 2_000,
  },
  token: "validated-acquiring-token",
});
```

The client groups operations into resource objects:

- `acquiring.merchant`: merchant identity operations
- `acquiring.invoices`: invoice lifecycle operations
- `acquiring.qr`: QR cashier listing, details, and amount reset
- `acquiring.statements`: transaction statement operations
- `acquiring.submerchants`: submerchant terminal operations
- `acquiring.webhooks`: webhook trust-material operations

## acquiring.webhooks.getPublicKey

```ts
acquiring.webhooks.getPublicKey(
  options?: RequestOptions,
): Promise<AcquiringWebhookPublicKey>
```

Loads the current webhook verification key from
`GET /api/merchant/pubkey`. The request sends the Acquiring token in
`X-Token`, validates the successful response with
`acquiringWebhookPublicKeySchema`, and returns `{ key: string }`. The `key`
field is Monobank's base64-encoded X.509 ECDSA public key.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringWebhookPublicKey`                                |

Throws `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

Monobank recommends caching the returned key and loading it again only after
verification with the cached key fails. The SDK deliberately leaves cache
storage, lifetime, and refresh coordination to the application.

## verifyAcquiringWebhookSignature

```ts
verifyAcquiringWebhookSignature(
  input: VerifyAcquiringWebhookSignatureInput,
): Promise<boolean>
```

Authenticates an Acquiring webhook with built-in Web Crypto in supported Node
and browser runtimes. No Node-only crypto import or additional runtime
dependency is required.

| Input       | Type                        | Contract                                                     |
| ----------- | --------------------------- | ------------------------------------------------------------ |
| `body`      | `ArrayBuffer \| Uint8Array` | Exact raw request body bytes                                 |
| `publicKey` | `string`                    | Base64-encoded X.509 ECDSA key from `getPublicKey()`         |
| `signature` | `string`                    | Base64-encoded ASN.1 DER value from the `X-Sign` HTTP header |

Returns `true` when the P-256 ECDSA/SHA-256 signature authenticates the exact
body bytes and `false` when a structurally valid signature does not match.
Malformed key or signature input throws `MonobankValidationError` with safe
diagnostics that do not retain the supplied cryptographic material.

```ts
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
```

The signature covers the raw wire bytes. Do not parse and reserialize JSON,
change whitespace, or decode the body before verification.

## merchant.getDetails

```ts
acquiring.merchant.getDetails(
  options?: RequestOptions,
): Promise<MerchantDetails>
```

Loads the merchant identity from `GET /api/merchant/details`.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `MerchantDetails`                                          |

Throws `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const merchant = await acquiring.merchant.getDetails();
console.log(merchant.merchantId, merchant.merchantName, merchant.edrpou);
```

## acquiring.submerchants.list

```ts
acquiring.submerchants.list(
  options?: RequestOptions,
): Promise<AcquiringSubmerchantList>
```

Loads `GET /api/merchant/submerchant/list`. Monobank exposes this endpoint to a
limited set of merchants that must explicitly choose a terminal when creating
an invoice. Each item provides the terminal `code` accepted by invoice and
statement inputs plus the terminal owner's `iban`.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringSubmerchantList` with readonly `list`            |

Throws `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const submerchants = await acquiring.submerchants.list();

for (const submerchant of submerchants.list) {
  console.log(submerchant.code, submerchant.iban);
}
```

## acquiring.qr.list

```ts
acquiring.qr.list(
  options?: RequestOptions,
): Promise<AcquiringQrCashierList>
```

Loads `GET /api/merchant/qr/list`. Each item carries the `shortQrId` printed on
the QR cashier, the `qrId` used by `acquiring.qr.getDetails()`, the hosted
`pageUrl`, and the `amountType` describing who sets the payment amount.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringQrCashierList` with readonly `list`              |

Throws `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const cashiers = await acquiring.qr.list();

for (const cashier of cashiers.list) {
  console.log(cashier.shortQrId, cashier.amountType, cashier.pageUrl);
}
```

## acquiring.qr.getDetails

```ts
acquiring.qr.getDetails(
  input: GetAcquiringQrDetailsInput,
  options?: RequestOptions,
): Promise<AcquiringQrDetails>
```

Loads `GET /api/merchant/qr/details`. Monobank answers only for activated QR
cashiers and documents `invoiceId` as present only while an amount is set on
the cashier; `amount` and `ccy` may be omitted for the same reason, so treat
all three as absent unless present. `amount` is an integer minor currency unit
and `ccy` is an ISO 4217 numeric code. `qrId` must be a nonempty string without
surrounding whitespace.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringQrDetails`                                       |

Rejects with `MonobankApiError` (including `404` for an unknown QR cashier),
`MonobankNetworkError`, `MonobankResponseValidationError`, or
`MonobankValidationError`. Input validation runs before Fetch and rejects the
returned promise rather than throwing synchronously.

```ts
const details = await acquiring.qr.getDetails({ qrId: "XJ_DiM4rTd5V" });

if (details.invoiceId !== undefined) {
  console.log(details.invoiceId, details.amount, details.ccy);
}
```

## acquiring.qr.resetAmount

```ts
acquiring.qr.resetAmount(
  input: ResetAcquiringQrAmountInput,
  options?: RequestOptions,
): Promise<void>
```

Posts `{ qrId }` to `POST /api/merchant/qr/reset-amount` to clear the payment
amount a merchant previously set on a QR cashier. Monobank acknowledges the
reset with an empty payload, so the method resolves to `undefined`. `qrId` is
validated exactly as in `acquiring.qr.getDetails()`.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Rate limit     | No endpoint-specific limit is encoded or enforced        |
| Retries        | Never; the request mutates merchant state                |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `void`                                                   |

Rejects with `MonobankApiError` (including `404` for an unknown QR cashier),
`MonobankNetworkError`, or `MonobankValidationError`. Input validation runs
before Fetch and rejects the returned promise rather than throwing
synchronously. A failed reset is never retried by the SDK; deciding whether to
repeat the mutation is the caller's responsibility.

```ts
await acquiring.qr.resetAmount({ qrId: "XJ_DiM4rTd5V" });
```

## acquiring.statements.get

```ts
acquiring.statements.get(
  input: GetAcquiringStatementsInput,
  options?: RequestOptions,
): Promise<AcquiringStatement>
```

Loads `GET /api/merchant/statement`. `from` is required; `to` and the
submerchant terminal `code` are optional. Dates are normalized to nonnegative
integer Unix seconds, `from` cannot be later than `to`, and a supplied code
must be nonempty without surrounding whitespace.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringStatement` with readonly newest-first `list`     |

Throws `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`. Validation
runs before Fetch.

```ts
const statement = await acquiring.statements.get({
  code: "terminal-42",
  from: new Date("2026-08-01T00:00:00Z"),
  to: new Date("2026-08-16T00:00:00Z"),
});

for (const item of statement.list) {
  console.log(item.invoiceId, item.status, item.amount, item.ccy);
}
```

## invoices.create

```ts
acquiring.invoices.create(
  input: CreateInvoiceInput,
  options?: CreateInvoiceOptions,
): Promise<NewInvoice>
```

Creates a hosted payment page through `POST /api/merchant/invoice/create`.
`amount` and all item sums are integer minor units. `ccy` is an optional numeric
ISO 4217 code; Monobank defaults it to 980.

Important input fields:

| Field              | Type                  | Required | Meaning                                      |
| ------------------ | --------------------- | -------- | -------------------------------------------- |
| `amount`           | `number`              | Yes      | Integer payment amount in minor units        |
| `ccy`              | `number`              | No       | Integer numeric ISO 4217 code                |
| `merchantPaymInfo` | `MerchantPaymentInfo` | No       | Order reference, description, basket, emails |
| `redirectUrl`      | `string`              | No       | Payer redirect target                        |
| `webHookUrl`       | `string`              | No       | Invoice-status callback target               |
| `validity`         | `number`              | No       | Integer lifetime in seconds                  |
| `paymentType`      | `InvoicePaymentType`  | No       | `"debit"` or `"hold"`; defaults upstream     |
| `saveCardData`     | object                | No       | Optional card-tokenization request           |

Returns `{ invoiceId, pageUrl }`. This mutating request is never retried.
Throws the four standard SDK error classes; input validation happens before
Fetch.

`CreateInvoiceOptions` extends `RequestOptions` with optional `cms` and
`cmsVersion` strings. They are sent as the official `X-Cms` and
`X-Cms-Version` integration-attribution headers.

```ts
const created = await acquiring.invoices.create({
  amount: 4_200,
  merchantPaymInfo: {
    destination: "Order 42",
    reference: "order-42",
  },
  webHookUrl: "https://example.com/webhooks/monobank",
});
```

## invoices.getStatus

```ts
acquiring.invoices.getStatus(
  input: GetInvoiceStatusInput,
  options?: RequestOptions,
): Promise<Invoice>
```

Loads `GET /api/merchant/invoice/status?invoiceId=...`. The invoice identifier
is required and URL-encoded. The response includes the documented status,
amount and currency plus optional timestamps, final amount, failure data,
payment details, cancellations, wallet data, and tips data.

This safe GET is eligible for configured retries. Throws the four standard SDK
error classes.

```ts
const invoice = await acquiring.invoices.getStatus({
  invoiceId: created.invoiceId,
});
```

## invoices.cancel

```ts
acquiring.invoices.cancel(
  input: CancelInvoiceInput,
  options?: RequestOptions,
): Promise<InvoiceCancellation>
```

Requests a full or partial cancellation through
`POST /api/merchant/invoice/cancel`. `invoiceId` is required; `amount`,
`extRef`, and fiscalization `items` are optional. The result contains a
documented cancellation status plus creation and modification timestamps.

This mutating request is never retried. Throws the four standard SDK error
classes.

## invoices.remove

```ts
acquiring.invoices.remove(
  input: RemoveInvoiceInput,
  options?: RequestOptions,
): Promise<void>
```

Invalidates an unpaid invoice through `POST /api/merchant/invoice/remove`.
Monobank rejects removal after payment. This mutating request is never retried.
Throws `MonobankApiError`, `MonobankNetworkError`, or
`MonobankValidationError`.

## invoices.finalize

```ts
acquiring.invoices.finalize(
  input: FinalizeInvoiceInput,
  options?: RequestOptions,
): Promise<InvoiceFinalization>
```

Captures all or part of an invoice created with `paymentType: "hold"` through
`POST /api/merchant/invoice/finalize`. `invoiceId` is required; a minor-unit
`amount` and fiscalization `items` are optional. Returns `{ status: "success" }`
when Monobank accepts the request.

This mutating request is never retried. Throws the four standard SDK error
classes.

## invoices.getReceipt

```ts
acquiring.invoices.getReceipt(
  input: GetInvoiceReceiptInput,
  options?: RequestOptions,
): Promise<InvoiceReceipt>
```

Loads `GET /api/merchant/invoice/receipt?invoiceId=...`. Supplying `email` also
asks Monobank to send the receipt there. The optional `file` response field is
a base64-encoded PDF.

This safe GET is eligible for configured retries. Throws the four standard SDK
error classes.

## invoices.getFiscalChecks

```ts
acquiring.invoices.getFiscalChecks(
  input: GetInvoiceFiscalChecksInput,
  options?: RequestOptions,
): Promise<InvoiceFiscalChecks>
```

Loads `GET /api/merchant/invoice/fiscal-checks?invoiceId=...`. Each check has a
required identifier, type, processing status, and fiscalization source plus
optional status text, tax URL, and base64 PDF.

This safe GET is eligible for configured retries. Throws the four standard SDK
error classes.

## bank.getSync

```ts
publicApi.bank.getSync(options?: RequestOptions): Promise<BankSync>
```

Loads public synchronization metadata from `GET /bank/sync`.

| Property       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| Authentication | Public; `X-Token` is not sent                                |
| Rate limit     | No endpoint-specific limit is encoded or enforced by the SDK |
| Retries        | Eligible when a retry policy is configured                   |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds     |
| Cancellation   | `options.signal` cancels the active request or retry delay   |
| Returns        | `BankSync`                                                   |

Throws `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const synchronization = await publicApi.bank.getSync();
console.log(synchronization.serverTimeMsec);
```

## currency.getRates

```ts
publicApi.currency.getRates(
  options?: RequestOptions,
): Promise<readonly CurrencyRate[]>
```

Loads public exchange-rate data from `GET /bank/currency`. Monobank may cache
this upstream response for five minutes.

| Property       | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| Authentication | Public; `X-Token` is not sent                                             |
| Rate limit     | No request schedule is enforced; responses may be cached for five minutes |
| Retries        | Eligible when a retry policy is configured                                |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds                  |
| Cancellation   | `options.signal` cancels the active request or retry delay                |
| Returns        | Readonly array of `CurrencyRate`                                          |

Throws `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const rates = await publicApi.currency.getRates();
const quotedAt = rates[0]?.date;
```

## client.getInfo

```ts
client.client.getInfo(options?: RequestOptions): Promise<ClientInfo>
```

Loads the authenticated Personal profile from `GET /personal/client-info`.
Monobank limits this endpoint to one request per 60 seconds.

| Property       | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| Authentication | Personal token in `X-Token`                                          |
| Rate limit     | One request per 60 seconds                                           |
| Retries        | Eligible when a retry policy is configured                           |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds             |
| Cancellation   | `options.signal` cancels the active request or retry delay           |
| Returns        | `ClientInfo`, including accounts, jars, and optional managed clients |

Throws `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const info = await client.client.getInfo();
const firstAccount = info.accounts[0];
```

## statements.get

```ts
client.statements.get(
  input: GetStatementsInput,
  options?: RequestOptions,
): Promise<readonly StatementItem[]>
```

Loads an account or jar statement from `GET /personal/statement/{account}/{from}/{to?}`.
Monobank limits this endpoint to one request per 60 seconds.

### Input

| Field     | Type             | Required | Contract                                       |
| --------- | ---------------- | -------- | ---------------------------------------------- |
| `account` | `string`         | No       | Account or jar identifier; omission uses `"0"` |
| `from`    | `Date \| number` | Yes      | Inclusive start time                           |
| `to`      | `Date \| number` | No       | Inclusive end time                             |

`Date` inputs are floored to integer Unix seconds. Numeric inputs must already
be finite, nonnegative Unix-second integers. When `to` is present, it must not
precede `from`, and the inclusive requested window must not exceed 2,682,000
seconds. The account identifier is encoded as one URL path segment.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Personal token in `X-Token`                                |
| Rate limit     | One request per 60 seconds                                 |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | Readonly array of `StatementItem`                          |

Throws `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const info = await client.client.getInfo();
const account = info.accounts[0];

if (account !== undefined) {
  const statements = await client.statements.get({
    account: account.id,
    from: new Date("2026-08-01T00:00:00.000Z"),
    to: new Date("2026-08-16T00:00:00.000Z"),
  });
}
```

Omit `account` to request Monobank's default account identifier:

```ts
const statements = await client.statements.get({
  from: 1_786_060_800,
  to: 1_787_356_800,
});
```

## webhooks.set

```ts
client.webhooks.set(
  input: SetWebhookInput,
  options?: RequestOptions,
): Promise<void>
```

Configures `POST /personal/webhook`.

Pass an absolute HTTP(S) URL to set a webhook. Pass an empty string to remove
the configured webhook. Relative URLs and other protocols fail locally with
`MonobankValidationError`.

| Property       | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| Authentication | Personal token in `X-Token`                                         |
| Rate limit     | No endpoint-specific limit is encoded or enforced by the SDK        |
| Retries        | Never; this is a mutating request                                   |
| Timeout        | `timeoutMs` for the single attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request                         |
| Returns        | `Promise<void>` after a successful response                         |

Throws `MonobankApiError`, `MonobankNetworkError`, or
`MonobankValidationError`.

```ts
await client.webhooks.set({
  webHookUrl: "https://example.com/webhooks/monobank",
});

await client.webhooks.set({ webHookUrl: "" });
```

## parsePersonalWebhookEvent

```ts
parsePersonalWebhookEvent(input: unknown): PersonalWebhookEvent
```

Validates parsed JSON against `personalWebhookEventSchema`. The parser stores
only safe schema issues on failure and does not retain the raw payload.

This function validates shape only. It does not authenticate the sender;
verify the delivery channel and any signature material before acting on the
event.

It is a synchronous local parser: authentication, network rate limits,
retries, timeouts, and cancellation do not apply.

Throws `MonobankResponseValidationError` when validation fails.

```ts
import { parsePersonalWebhookEvent } from "@liaugust/monobank-sdk";

const event = parsePersonalWebhookEvent(await request.json());

// Authenticate delivery separately, then pass `event` to application logic.
```

## Errors

### MonobankValidationError

Invalid SDK configuration or method input detected before Fetch.

| Property   | Type                        | Meaning                               |
| ---------- | --------------------------- | ------------------------------------- |
| `name`     | `"MonobankValidationError"` | Stable error name                     |
| `endpoint` | `string \| undefined`       | Endpoint or operation when applicable |
| `issues`   | `readonly string[]`         | Safe validation messages              |

### MonobankNetworkError

A failure before a complete HTTP response exists.

| Property   | Type                                  | Meaning                    |
| ---------- | ------------------------------------- | -------------------------- |
| `name`     | `"MonobankNetworkError"`              | Stable error name          |
| `endpoint` | `string`                              | Endpoint being called      |
| `reason`   | `"aborted" \| "network" \| "timeout"` | Stable failure category    |
| `cause`    | `Error \| undefined`                  | Optional safe native cause |

### MonobankApiError

A non-success HTTP response from Monobank or an intermediary.

| Property          | Type                               | Meaning                                                               |
| ----------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `name`            | `"MonobankApiError"`               | Stable error name                                                     |
| `endpoint`        | `string`                           | Endpoint being called                                                 |
| `status`          | `number`                           | HTTP status                                                           |
| `headers`         | `Readonly<Record<string, string>>` | Copied headers excluding `authorization` and names containing `token` |
| `retryAfterMs`    | `number \| undefined`              | Parsed `Retry-After` delay in milliseconds                            |
| `upstreamMessage` | `string \| undefined`              | Redacted upstream text, bounded to 1,024 characters                   |

### MonobankResponseValidationError

A successful response or supplied webhook payload did not match its runtime
schema.

| Property   | Type                                 | Meaning                           |
| ---------- | ------------------------------------ | --------------------------------- |
| `name`     | `"MonobankResponseValidationError"`  | Stable error name                 |
| `endpoint` | `string`                             | Endpoint or parser context        |
| `issues`   | `readonly ResponseValidationIssue[]` | Safe code, path, and message data |

### Narrowing errors

```ts
import {
  MonobankApiError,
  MonobankNetworkError,
  MonobankResponseValidationError,
  MonobankValidationError,
} from "@liaugust/monobank-sdk";

function classifyError(error: unknown): string {
  if (error instanceof MonobankApiError) {
    return `api:${String(error.status)}`;
  }

  if (error instanceof MonobankNetworkError) {
    return `network:${error.reason}`;
  }

  if (error instanceof MonobankResponseValidationError) {
    return `response:${error.endpoint}`;
  }

  if (error instanceof MonobankValidationError) {
    return `input:${error.endpoint ?? "configuration"}`;
  }

  throw error;
}
```

## Runtime schemas

All schemas expose Zod Mini's standard parsing interface. Object schemas are
loose: documented fields are validated and unknown additive fields are
preserved.

| Export                                 | Validates                           |
| -------------------------------------- | ----------------------------------- |
| `accountSchema`                        | One Personal account                |
| `acquiringQrCashierListSchema`         | Acquiring QR cashier-list response  |
| `acquiringQrCashierSchema`             | One Acquiring QR cashier            |
| `acquiringQrDetailsSchema`             | Acquiring QR cashier details        |
| `acquiringStatementSchema`             | Acquiring statement response        |
| `acquiringStatementItemSchema`         | One Acquiring transaction           |
| `acquiringStatementCancellationSchema` | Nested Acquiring cancellation       |
| `acquiringSubmerchantListSchema`       | Acquiring submerchant-list response |
| `acquiringSubmerchantSchema`           | One Acquiring submerchant           |
| `acquiringWebhookPublicKeySchema`      | Acquiring webhook key response      |
| `bankSyncSchema`                       | `/bank/sync` response               |
| `clientInfoSchema`                     | `/personal/client-info` response    |
| `currencyRateSchema`                   | One exchange-rate item              |
| `currencyRatesSchema`                  | `/bank/currency` response array     |
| `jarSchema`                            | One Personal jar                    |
| `managedAccountSchema`                 | One delegated FOP account           |
| `managedClientSchema`                  | One delegated FOP client            |
| `merchantDetailsSchema`                | `/api/merchant/details` response    |
| `newInvoiceSchema`                     | Create-invoice response             |
| `invoiceStatusSchema`                  | Invoice status or webhook payload   |
| `cancelInvoiceResponseSchema`          | Invoice cancellation response       |
| `finalizeInvoiceResponseSchema`        | Hold finalization response          |
| `receiptSchema`                        | Invoice receipt response            |
| `invoiceFiscalChecksSchema`            | Invoice fiscal checks response      |
| `statementItemSchema`                  | One statement item                  |
| `statementItemsSchema`                 | Statement response array            |
| `personalWebhookEventSchema`           | Incoming Personal statement event   |

```ts
import { currencyRatesSchema } from "@liaugust/monobank-sdk";

const parsed = currencyRatesSchema.safeParse(untrustedJson);

if (parsed.success) {
  console.log(parsed.data);
}
```

## Enum-like values

The SDK exports importable const objects with matching union types. They
provide enum-like values without emitted TypeScript enum code.

```ts
import {
  AccountType,
  CashbackType,
  type AccountType as AccountTypeValue,
  type CashbackType as CashbackTypeValue,
} from "@liaugust/monobank-sdk";

const accountType: AccountTypeValue = AccountType.Black;
const cashbackType: CashbackTypeValue = CashbackType.UAH;
```

### AccountType values

| Property   | Wire value   |
| ---------- | ------------ |
| `Black`    | `"black"`    |
| `EAid`     | `"eAid"`     |
| `Fop`      | `"fop"`      |
| `Iron`     | `"iron"`     |
| `Platinum` | `"platinum"` |
| `White`    | `"white"`    |
| `Yellow`   | `"yellow"`   |

### CashbackType values

| Property | Wire value |
| -------- | ---------- |
| `Miles`  | `"Miles"`  |
| `None`   | `"None"`   |
| `UAH`    | `"UAH"`    |

### Acquiring values

| Export                      | Wire values                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `InvoicePaymentType`        | `debit`, `hold`                                                              |
| `AcquiringPaymentScheme`    | `full`, `bnpl_later_30`, `bnpl_parts_4`                                      |
| `AcquiringQrAmountType`     | `client`, `fix`, `merchant`                                                  |
| `AcquiringStatementStatus`  | `hold`, `processing`, `success`, `failure`                                   |
| `InvoiceStatus`             | `created`, `processing`, `hold`, `success`, `failure`, `reversed`, `expired` |
| `InvoiceCancellationStatus` | `processing`, `success`, `failure`                                           |
| `InvoicePaymentSystem`      | `visa`, `mastercard`                                                         |
| `InvoicePaymentMethod`      | `pan`, `apple`, `google`, `monobank`, `wallet`, `direct`                     |
| `InvoiceWalletStatus`       | `new`, `created`, `failed`                                                   |
| `DiscountType`              | `DISCOUNT`, `EXTRA_CHARGE`                                                   |
| `DiscountMode`              | `PERCENT`, `VALUE`                                                           |
| `FiscalCheckType`           | `sale`, `return`                                                             |
| `FiscalCheckStatus`         | `new`, `process`, `done`, `failed`                                           |
| `FiscalizationSource`       | `checkbox`, `monopay`                                                        |

## Response models

### Account

| Field          | Type           | Notes                         |
| -------------- | -------------- | ----------------------------- |
| `id`           | `string`       | Account identifier            |
| `sendId`       | `string`       | Public send identifier        |
| `balance`      | `number`       | Integer minor units           |
| `creditLimit`  | `number`       | Integer minor units           |
| `type`         | `AccountType`  | Documented account wire value |
| `currencyCode` | `number`       | Numeric ISO 4217 code         |
| `cashbackType` | `CashbackType` | Cashback mode                 |
| `maskedPan`    | `string[]`     | Masked payment-card numbers   |
| `iban`         | `string`       | Account IBAN                  |

### BankSync

| Field            | Type     | Notes                              |
| ---------------- | -------- | ---------------------------------- |
| `serverTimeMsec` | `number` | Integer Unix milliseconds          |
| `serverKeyId`    | `string` | Public verification-key identifier |
| `serverPubKey`   | `string` | Public verification key            |

### CurrencyRate

| Field           | Type                  | Notes                       |
| --------------- | --------------------- | --------------------------- |
| `currencyCodeA` | `number`              | Base numeric ISO 4217 code  |
| `currencyCodeB` | `number`              | Quote numeric ISO 4217 code |
| `date`          | `number`              | Integer Unix seconds        |
| `rateBuy`       | `number \| undefined` | Optional buy rate           |
| `rateSell`      | `number \| undefined` | Optional sell rate          |
| `rateCross`     | `number \| undefined` | Optional cross rate         |

At least one of `rateBuy`, `rateSell`, or `rateCross` is present after
validation.

### ClientInfo

| Field            | Type                                    | Notes                          |
| ---------------- | --------------------------------------- | ------------------------------ |
| `clientId`       | `string`                                | Personal client identifier     |
| `name`           | `string`                                | Client display name            |
| `webHookUrl`     | `string`                                | Current upstream webhook URL   |
| `permissions`    | `string`                                | Upstream capability flags      |
| `accounts`       | `readonly Account[]`                    | Personal accounts              |
| `jars`           | `readonly Jar[]`                        | Savings jars                   |
| `managedClients` | `readonly ManagedClient[] \| undefined` | Optional delegated FOP clients |

### MerchantDetails

| Field          | Type     | Notes                             |
| -------------- | -------- | --------------------------------- |
| `merchantId`   | `string` | Acquiring merchant identifier     |
| `merchantName` | `string` | Merchant display name             |
| `edrpou`       | `string` | Ukrainian registration identifier |

### AcquiringSubmerchantList

`AcquiringSubmerchantList.list` is a readonly array of terminals available to
the configured merchant. Loose schemas preserve additive upstream fields on
both the response wrapper and each item.

| Item field | Type     | Required | Notes                           |
| ---------- | -------- | -------- | ------------------------------- |
| `code`     | `string` | Yes      | Submerchant terminal identifier |
| `iban`     | `string` | Yes      | Terminal owner IBAN             |
| `edrpou`   | `string` | No       | Terminal owner EDRPOU           |
| `owner`    | `string` | No       | Terminal owner name             |

### AcquiringQrCashierList

`AcquiringQrCashierList.list` is a readonly array of QR cashiers registered for
the configured merchant. Loose schemas preserve additive upstream fields on
both the response wrapper and each item.

| Item field   | Type                    | Required | Notes                                  |
| ------------ | ----------------------- | -------- | -------------------------------------- |
| `shortQrId`  | `string`                | Yes      | Short identifier printed on the QR     |
| `qrId`       | `string`                | Yes      | Identifier accepted by `getDetails()`  |
| `amountType` | `AcquiringQrAmountType` | Yes      | Who sets the amount for this cashier   |
| `pageUrl`    | `string`                | Yes      | Hosted payment page for the QR cashier |

### AcquiringQrDetails

Monobank answers `acquiring.qr.getDetails()` only for activated QR cashiers.
`invoiceId` is documented as present only while an amount is set on the
cashier, and `amount` and `ccy` may be omitted for the same reason. The loose
schema preserves additive upstream fields.

| Field       | Type     | Required | Notes                                  |
| ----------- | -------- | -------- | -------------------------------------- |
| `shortQrId` | `string` | Yes      | Short identifier printed on the QR     |
| `invoiceId` | `string` | No       | Invoice created for the current amount |
| `amount`    | `number` | No       | Integer amount in minor currency units |
| `ccy`       | `number` | No       | Numeric ISO 4217 currency code         |

### AcquiringWebhookPublicKey

| Field | Type     | Notes                                         |
| ----- | -------- | --------------------------------------------- |
| `key` | `string` | Base64-encoded X.509 ECDSA webhook public key |

### Acquiring invoice models

- `NewInvoice` contains the Monobank `invoiceId` and hosted `pageUrl`.
- `Invoice` contains required `invoiceId`, `status`, `amount`, and `ccy`, plus
  optional lifecycle timestamps, payment/cancellation details, wallet data,
  tips data, failure information, reference, destination, and final amount.
- `InvoiceCancellation` contains `status`, `createdDate`, and `modifiedDate`
  plus optional cancellation transaction data when returned in invoice status.
- `InvoiceFinalization` contains the literal status `"success"`.
- `InvoiceReceipt` optionally contains a base64-encoded PDF in `file`.
- `InvoiceFiscalChecks` optionally contains `checks`; check records use the
  exported fiscal enum-like values and may include a tax URL or base64 PDF.

### AcquiringStatement

`AcquiringStatement.list` is a readonly newest-first array. Each item contains
required `invoiceId`, `status`, `maskedPan`, RFC-3339 `date`, `paymentScheme`,
integer `amount`, and numeric ISO 4217 `ccy`. Optional fields include merchant
profit, reference, destination, authorization data, QR identifier, and nested
cancellations. Loose schemas preserve additive upstream fields.

| Item field      | Type                               | Required | Notes                                       |
| --------------- | ---------------------------------- | -------- | ------------------------------------------- |
| `invoiceId`     | `string`                           | Yes      | Acquiring invoice identifier                |
| `status`        | `AcquiringStatementStatus`         | Yes      | Transaction processing status               |
| `maskedPan`     | `string`                           | Yes      | Masked payment-card number                  |
| `date`          | `string`                           | Yes      | RFC-3339 transaction timestamp              |
| `amount`        | `number`                           | Yes      | Integer amount in minor currency units      |
| `ccy`           | `number`                           | Yes      | Numeric ISO 4217 currency code              |
| `paymentScheme` | `AcquiringPaymentScheme`           | Yes      | Full payment or documented installment plan |
| `profitAmount`  | `number`                           | No       | Integer merchant proceeds in minor units    |
| `reference`     | `string`                           | No       | Merchant payment reference                  |
| `destination`   | `string`                           | No       | Payment destination                         |
| `approvalCode`  | `string`                           | No       | Authorization approval code                 |
| `rrn`           | `string`                           | No       | Retrieval reference number                  |
| `shortQrId`     | `string \| null`                   | No       | Short QR identifier when supplied           |
| `cancelList`    | `AcquiringStatementCancellation[]` | No       | Cancellation records for the transaction    |

Each `cancelList` entry has the following documented fields:

| Cancellation field | Type     | Required | Notes                                    |
| ------------------ | -------- | -------- | ---------------------------------------- |
| `amount`           | `number` | Yes      | Integer amount in minor currency units   |
| `ccy`              | `number` | Yes      | Numeric ISO 4217 currency code           |
| `date`             | `string` | Yes      | RFC-3339 cancellation timestamp          |
| `maskedPan`        | `string` | Yes      | Masked payment-card number               |
| `approvalCode`     | `string` | No       | Cancellation authorization approval code |
| `rrn`              | `string` | No       | Retrieval reference number               |

### Jar

| Field          | Type     | Notes                  |
| -------------- | -------- | ---------------------- |
| `id`           | `string` | Jar identifier         |
| `sendId`       | `string` | Public send identifier |
| `title`        | `string` | Jar title              |
| `description`  | `string` | Jar description        |
| `currencyCode` | `number` | Numeric ISO 4217 code  |
| `balance`      | `number` | Integer minor units    |
| `goal`         | `number` | Integer minor units    |

### ManagedClient and ManagedAccount

`ManagedClient` contains `clientId`, `name`, `tin`, and a readonly `accounts`
array. `tin` is preserved as `string | number` because official upstream
examples use both representations.

Each `ManagedAccount` contains `id`, `balance`, `creditLimit`, `currencyCode`,
`iban`, and `type: "fop"`. Monetary fields use integer minor units.

### StatementItem

| Field             | Type                  | Notes                                   |
| ----------------- | --------------------- | --------------------------------------- |
| `id`              | `string`              | Statement item identifier               |
| `time`            | `number`              | Integer Unix seconds                    |
| `description`     | `string`              | Transaction description                 |
| `mcc`             | `number`              | Merchant category code                  |
| `originalMcc`     | `number`              | Original merchant category code         |
| `hold`            | `boolean`             | Whether the operation is on hold        |
| `amount`          | `number`              | Signed integer minor units              |
| `operationAmount` | `number`              | Signed integer minor units              |
| `currencyCode`    | `number`              | Numeric ISO 4217 code                   |
| `commissionRate`  | `number`              | Integer minor units                     |
| `cashbackAmount`  | `number`              | Integer minor units                     |
| `balance`         | `number`              | Resulting integer minor-unit balance    |
| `comment`         | `string \| undefined` | Optional payment comment                |
| `receiptId`       | `string \| undefined` | Optional receipt identifier             |
| `invoiceId`       | `string \| undefined` | Optional invoice identifier             |
| `counterEdrpou`   | `string \| undefined` | Optional counterparty registration code |
| `counterIban`     | `string \| undefined` | Optional counterparty IBAN              |
| `counterName`     | `string \| undefined` | Optional counterparty name              |

### PersonalWebhookEvent

The currently supported webhook event has `type: "StatementItem"` and a `data`
object containing the target `account` identifier and validated
`statementItem`.

## Supporting types

| Export                                   | Purpose                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| `MonobankPublicClientOptions`            | Token-free Public constructor configuration                    |
| `MonobankPersonalClientOptions`          | Constructor configuration                                      |
| `MonobankAcquiringClientOptions`         | Acquiring constructor configuration                            |
| `RequestOptions`                         | Optional per-request `AbortSignal`                             |
| `RetryOptions`                           | Safe GET retry policy                                          |
| `GetStatementsInput`                     | Statement account and time window                              |
| `UnixTimeInput`                          | `Date \| number` statement timestamp input                     |
| `GetAcquiringStatementsInput`            | Acquiring time window and optional submerchant terminal        |
| `AcquiringStatementUnixTimeInput`        | `Date \| number` Acquiring statement timestamp input           |
| `GetAcquiringQrDetailsInput`             | QR cashier identifier for details lookup                       |
| `ResetAcquiringQrAmountInput`            | QR cashier identifier for clearing a set amount                |
| `SetWebhookInput`                        | Webhook URL request body                                       |
| `VerifyAcquiringWebhookSignatureInput`   | Raw body, public key, and signature verification inputs        |
| `CreateInvoiceInput`                     | Invoice amount, order, redirect, webhook, and payment controls |
| `CreateInvoiceOptions`                   | Cancellation and optional CMS attribution headers              |
| `GetInvoiceStatusInput`                  | Invoice identifier for status lookup                           |
| `CancelInvoiceInput`                     | Full or partial cancellation request                           |
| `RemoveInvoiceInput`                     | Unpaid invoice identifier                                      |
| `FinalizeInvoiceInput`                   | Hold capture request                                           |
| `GetInvoiceReceiptInput`                 | Receipt lookup and optional delivery email                     |
| `GetInvoiceFiscalChecksInput`            | Fiscal-check lookup                                            |
| `MerchantPaymentInfo`                    | Merchant order metadata and basket                             |
| `InvoiceBasketItem`                      | Itemized invoice product or service                            |
| `InvoiceDiscount`                        | Basket or order adjustment                                     |
| `FiscalizationItem`                      | Item sent for cancellation/finalization fiscalization          |
| `FetchLike`                              | Injectable Fetch-compatible function                           |
| `ResponseValidationIssue`                | Safe schema issue retained by validation errors                |
| `MonobankApiErrorOptions`                | Public API-error constructor data                              |
| `MonobankNetworkErrorOptions`            | Public network-error constructor data                          |
| `MonobankNetworkErrorReason`             | `"aborted" \| "network" \| "timeout"`                          |
| `MonobankResponseValidationErrorOptions` | Public response-validation constructor data                    |
| `MonobankValidationErrorOptions`         | Public input-validation constructor data                       |

Response types are inferred from their runtime schemas and exported from the
package root, including the Personal models plus `MerchantDetails`,
`AcquiringSubmerchant`, `AcquiringSubmerchantList`, `AcquiringQrCashier`,
`AcquiringQrCashierList`, `AcquiringQrDetails`,
`AcquiringWebhookPublicKey`, `AcquiringStatement`, `AcquiringStatementItem`,
`AcquiringStatementCancellation`, `NewInvoice`, `Invoice`,
`InvoiceCancellation`, `InvoiceFinalization`, `InvoiceReceipt`, and
`InvoiceFiscalChecks`.
