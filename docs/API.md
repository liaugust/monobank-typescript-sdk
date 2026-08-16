# API Reference

Complete public API reference for `@liaugust/monobank-sdk`.

The package has one root entry point. Import public clients, values, schemas,
errors, and types from `@liaugust/monobank-sdk`; internal file paths are not a
supported contract.

## Contents

- [Shared conventions](#shared-conventions)
- [MonobankPersonalClient](#monobankpersonalclient)
- [MonobankAcquiringClient](#monobankacquiringclient)
- [getMerchantDetails](#getmerchantdetails)
- [getBankSync](#getbanksync)
- [getCurrencyRates](#getcurrencyrates)
- [getClientInfo](#getclientinfo)
- [getStatements](#getstatements)
- [setWebhook](#setwebhook)
- [parsePersonalWebhookEvent](#parsepersonalwebhookevent)
- [Errors](#errors)
- [Runtime schemas](#runtime-schemas)
- [Enum-like values](#enum-like-values)
- [Response models](#response-models)
- [Supporting types](#supporting-types)

## Shared conventions

- Monetary integers use the currency's minor units.
- Currency codes are numeric ISO 4217 codes.
- Rate and statement timestamps are Unix seconds.
- `BankSync.serverTimeMsec` is Unix milliseconds.
- Successful JSON responses are parsed through Zod Mini schemas.
- Response objects preserve unknown additive fields from Monobank.
- A Personal token is sent only to authenticated `/personal/*` endpoints, and
  an Acquiring token is sent only to authenticated `/api/merchant/*` endpoints.
- Optional request controls use `RequestOptions`, whose only field is
  `signal?: AbortSignal`.

## MonobankPersonalClient

```ts
new MonobankPersonalClient(options: MonobankPersonalClientOptions)
```

The client contains the implemented Public and Personal API methods. A token is
required at construction even when an application uses a public method, but
the SDK does not send it to `/bank/*` endpoints.

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
the request fails without another attempt. `setWebhook()` is never retried.

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

## getMerchantDetails

```ts
acquiring.getMerchantDetails(
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
const merchant = await acquiring.getMerchantDetails();
console.log(merchant.merchantId, merchant.merchantName, merchant.edrpou);
```

## getBankSync

```ts
client.getBankSync(options?: RequestOptions): Promise<BankSync>
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
const synchronization = await client.getBankSync();
console.log(synchronization.serverTimeMsec);
```

## getCurrencyRates

```ts
client.getCurrencyRates(
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
const rates = await client.getCurrencyRates();
const quotedAt = rates[0]?.date;
```

## getClientInfo

```ts
client.getClientInfo(options?: RequestOptions): Promise<ClientInfo>
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
const info = await client.getClientInfo();
const firstAccount = info.accounts[0];
```

## getStatements

```ts
client.getStatements(
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
const info = await client.getClientInfo();
const account = info.accounts[0];

if (account !== undefined) {
  const statements = await client.getStatements({
    account: account.id,
    from: new Date("2026-08-01T00:00:00.000Z"),
    to: new Date("2026-08-16T00:00:00.000Z"),
  });
}
```

Omit `account` to request Monobank's default account identifier:

```ts
const statements = await client.getStatements({
  from: 1_786_060_800,
  to: 1_787_356_800,
});
```

## setWebhook

```ts
client.setWebhook(
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
await client.setWebhook({
  webHookUrl: "https://example.com/webhooks/monobank",
});

await client.setWebhook({ webHookUrl: "" });
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

| Export                       | Validates                         |
| ---------------------------- | --------------------------------- |
| `accountSchema`              | One Personal account              |
| `bankSyncSchema`             | `/bank/sync` response             |
| `clientInfoSchema`           | `/personal/client-info` response  |
| `currencyRateSchema`         | One exchange-rate item            |
| `currencyRatesSchema`        | `/bank/currency` response array   |
| `jarSchema`                  | One Personal jar                  |
| `managedAccountSchema`       | One delegated FOP account         |
| `managedClientSchema`        | One delegated FOP client          |
| `merchantDetailsSchema`      | `/api/merchant/details` response  |
| `statementItemSchema`        | One statement item                |
| `statementItemsSchema`       | Statement response array          |
| `personalWebhookEventSchema` | Incoming Personal statement event |

```ts
import { currencyRatesSchema } from "@liaugust/monobank-sdk";

const parsed = currencyRatesSchema.safeParse(untrustedJson);

if (parsed.success) {
  console.log(parsed.data);
}
```

## Enum-like values

`AccountType` and `CashbackType` are importable const objects with matching
union types. They provide enum-like values without emitted TypeScript enum
code.

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

| Export                                   | Purpose                                         |
| ---------------------------------------- | ----------------------------------------------- |
| `MonobankPersonalClientOptions`          | Constructor configuration                       |
| `MonobankAcquiringClientOptions`         | Acquiring constructor configuration             |
| `RequestOptions`                         | Optional per-request `AbortSignal`              |
| `RetryOptions`                           | Safe GET retry policy                           |
| `GetStatementsInput`                     | Statement account and time window               |
| `UnixTimeInput`                          | `Date \| number` statement timestamp input      |
| `SetWebhookInput`                        | Webhook URL request body                        |
| `FetchLike`                              | Injectable Fetch-compatible function            |
| `ResponseValidationIssue`                | Safe schema issue retained by validation errors |
| `MonobankApiErrorOptions`                | Public API-error constructor data               |
| `MonobankNetworkErrorOptions`            | Public network-error constructor data           |
| `MonobankNetworkErrorReason`             | `"aborted" \| "network" \| "timeout"`           |
| `MonobankResponseValidationErrorOptions` | Public response-validation constructor data     |
| `MonobankValidationErrorOptions`         | Public input-validation constructor data        |

The response types `Account`, `BankSync`, `ClientInfo`, `CurrencyRate`, `Jar`,
`ManagedAccount`, `ManagedClient`, `MerchantDetails`, `PersonalWebhookEvent`,
and `StatementItem` are inferred from their runtime schemas and exported from
the package root.
