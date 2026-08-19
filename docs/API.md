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
- [MonobankCorporateClient](#monobankcorporateclient)
- [acquiring.webhooks.getPublicKey](#acquiringwebhooksgetpublickey)
- [verifyAcquiringWebhookSignature](#verifyacquiringwebhooksignature)
- [merchant.getDetails](#merchantgetdetails)
- [acquiring.submerchants.list](#acquiringsubmerchantslist)
- [acquiring.employees.list](#acquiringemployeeslist)
- [acquiring.wallet.list](#acquiringwalletlist)
- [acquiring.wallet.pay](#acquiringwalletpay)
- [acquiring.wallet.deleteCard](#acquiringwalletdeletecard)
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
- [invoices.payDirect](#invoicespaydirect)
- [invoices.syncPayment](#invoicessyncpayment)
- [acquiring.subscriptions.create](#acquiringsubscriptionscreate)
- [acquiring.subscriptions.getStatus](#acquiringsubscriptionsgetstatus)
- [acquiring.subscriptions.list](#acquiringsubscriptionslist)
- [acquiring.subscriptions.getPayments](#acquiringsubscriptionsgetpayments)
- [acquiring.subscriptions.edit](#acquiringsubscriptionsedit)
- [acquiring.subscriptions.remove](#acquiringsubscriptionsremove)
- [acquiring.monopay.listKeys](#acquiringmonopaylistkeys)
- [acquiring.monopay.importKey](#acquiringmonopayimportkey)
- [acquiring.monopay.deleteKey](#acquiringmonopaydeletekey)
- [acquiring.t2p.listTerminals](#acquiringt2plistterminals)
- [acquiring.t2p.getPaymentStatus](#acquiringt2pgetpaymentstatus)
- [acquiring.split.listReceivers](#acquiringsplitlistreceivers)
- [acquiring.pos.cancelTransaction](#acquiringposcanceltransaction)
- [bank.getSync](#bankgetsync)
- [currency.getRates](#currencygetrates)
- [client.getInfo](#clientgetinfo)
- [statements.get](#statementsget)
- [webhooks.set](#webhooksset)
- [parsePersonalWebhookEvent](#parsepersonalwebhookevent)
- [corporate.access.request](#corporateaccessrequest)
- [corporate.access.check](#corporateaccesscheck)
- [corporate.clients.getInfo](#corporateclientsgetinfo)
- [corporate.clients.getStatements](#corporateclientsgetstatements)
- [corporate.documents.requestSigning](#corporatedocumentsrequestsigning)
- [corporate.documents.getSigningStatus](#corporatedocumentsgetsigningstatus)
- [corporate.documents.cancelSigning](#corporatedocumentscancelsigning)
- [corporate.company.register](#corporatecompanyregister)
- [corporate.company.getRegistrationStatus](#corporatecompanygetregistrationstatus)
- [corporate.company.getSettings](#corporatecompanygetsettings)
- [corporate.company.setWebhook](#corporatecompanysetwebhook)
- [Retry policy](#retry-policy)
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
- The transport sets `redirect: "error"`, so redirects are never followed with
  the runtime's built-in Fetch. A redirected request fails with
  `MonobankNetworkError` (`reason: "network"`) rather than resending the token
  or the request body to another origin. Because that reason is shared with
  transient failures, a retry-eligible safe GET consumes its configured
  attempts first; mutating requests are never retried.
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
contracts and defaults as the authenticated clients. Because the Public client never
holds a token, its `baseUrl` may use cleartext `http:` for any host.

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

| Option      | Type           | Default                   | Contract                                                                                                                |
| ----------- | -------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `token`     | `string`       | Required                  | Nonempty and without surrounding whitespace                                                                             |
| `baseUrl`   | `string`       | `https://api.monobank.ua` | Absolute HTTP(S) origin, primarily for controlled proxies and tests; must use `https` unless it targets a loopback host |
| `fetch`     | `FetchLike`    | `globalThis.fetch`        | Required when the runtime does not provide global Fetch; must honor `RequestInit.redirect`                              |
| `timeoutMs` | `number`       | `10_000`                  | Positive finite per-attempt timeout in milliseconds                                                                     |
| `retry`     | `RetryOptions` | Disabled                  | Bounded policy for retry-eligible safe GET requests; narrow `retryableStatusCodes` when a retry cannot help             |

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

| Option      | Type           | Default                   | Contract                                                                                                                |
| ----------- | -------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `token`     | `string`       | Required                  | Nonempty Acquiring token without surrounding whitespace                                                                 |
| `baseUrl`   | `string`       | `https://api.monobank.ua` | Absolute HTTP(S) origin, primarily for controlled proxies and tests; must use `https` unless it targets a loopback host |
| `fetch`     | `FetchLike`    | `globalThis.fetch`        | Required when the runtime does not provide global Fetch; must honor `RequestInit.redirect`                              |
| `timeoutMs` | `number`       | `10_000`                  | Positive finite per-attempt timeout in milliseconds                                                                     |
| `retry`     | `RetryOptions` | Disabled                  | Bounded policy for retry-eligible safe GET requests; narrow `retryableStatusCodes` when a retry cannot help             |

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

- `acquiring.employees`: employee operations for tip routing
- `acquiring.merchant`: merchant identity operations
- `acquiring.invoices`: invoice lifecycle operations
- `acquiring.qr`: QR cashier listing, details, and amount reset
- `acquiring.statements`: transaction statement operations
- `acquiring.submerchants`: submerchant terminal operations
- `acquiring.wallet`: tokenized card operations
- `acquiring.webhooks`: webhook trust-material operations

## MonobankCorporateClient

```ts
new MonobankCorporateClient(options: MonobankCorporateClientOptions)
```

The Corporate provider API does not authenticate with `X-Token`. Every request
carries `X-Time` and `X-Sign`, plus `X-Key-Id` for every operation except the two
registration calls that issue the key, and `X-Request-Id` where documented.
Monobank issues the service key only after approving the company as a provider.

Service keys are **secp256k1**, which Web Crypto cannot sign with. A crypto
dependency would break the single-runtime-dependency rule and a `node:crypto`
import would break the browser build, so the signer is injected and the SDK never
holds the private key.

### Constructor options

| Option      | Type              | Default                   | Contract                                                                                                                |
| ----------- | ----------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `keyId`     | `string`          | Optional                  | Printable ASCII service key identifier; omit only for the registration flow, which is what issues it                    |
| `sign`      | `CorporateSigner` | Required                  | Function returning the `X-Sign` value; may be synchronous or asynchronous                                               |
| `baseUrl`   | `string`          | `https://api.monobank.ua` | Absolute HTTP(S) origin, primarily for controlled proxies and tests; must use `https` unless it targets a loopback host |
| `fetch`     | `FetchLike`       | `globalThis.fetch`        | Required when the runtime does not provide global Fetch; must honor `RequestInit.redirect`                              |
| `timeoutMs` | `number`          | `10_000`                  | Positive finite per-attempt timeout in milliseconds, covering both the signer and the request                           |
| `retry`     | `RetryOptions`    | Disabled                  | Bounded policy for retry-eligible safe GET requests; narrow `retryableStatusCodes` when a retry cannot help             |

A transport cannot hold both a `token` and a Corporate credential; attempting it
throws `MonobankValidationError`. Invalid constructor configuration throws before
a request is made.

The client groups operations into resource objects:

- `corporate.access`: delegated client-access grant operations
- `corporate.clients`: reads of a granted client's data
- `corporate.documents`: monoКЕП document signing operations
- `corporate.company`: company registration and settings operations

### Signing contract

`sign` receives a `CorporateSignatureInput`:

| Field       | Type     | Meaning                                                         |
| ----------- | -------- | --------------------------------------------------------------- |
| `payload`   | `string` | Exact string this SDK expects to be signed                      |
| `time`      | `string` | Value sent as `X-Time`: current UTC time in whole seconds       |
| `requestId` | `string` | Value sent as `X-Request-Id`; absent for endpoints that omit it |
| `url`       | `URL`    | Absolute request URL the payload was derived from               |

The return value is sent verbatim as `X-Sign`. Monobank's own documented example
decodes to the raw 64-byte `r || s` pair, not a DER structure, so a DER signature
is rejected. With `node:crypto`, that means
`sign({ dsaEncoding: "ieee-p1363", key }, "base64")`.

Two properties are **not documented by Monobank** and cannot be verified without
provider approval: the digest applied before signing (`SHA256` matches the wider
ecosystem), and whether `URL` means the path, the path with its query, or an
absolute URL.

This SDK signs the path with its query. Because `payload` arrives alongside
`time`, `requestId`, and `url`, an application can rebuild it if the bank expects
a different composition, without forking the SDK.

Monobank documents two compositions, and they do not follow from the headers sent:
`/personal/corp/settings` sends `X-Request-Id` while signing the variant that
excludes it, so each operation states its own.

`sign` is invoked **once per attempt**, not once per request, because `X-Time` is
part of the payload and a retry after a backoff delay must not replay a stale
timestamp.

`timeoutMs` bounds the signer as well as the request. A signing call that never
settles fails with `MonobankNetworkError` and `reason: "timeout"` when the attempt
elapses, and a caller abort during signing reports `reason: "aborted"`. Neither is
retried, matching how this SDK treats every other timeout.

A signer that throws, or returns an empty string, produces
`MonobankValidationError` before Fetch runs. The signer's own failure is never
attached as a cause, because a crypto library's error text can echo key material.

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

## acquiring.employees.list

```ts
acquiring.employees.list(
  options?: RequestOptions,
): Promise<AcquiringEmployeeList>
```

Loads `GET /api/merchant/employee/list`. Each `id` is accepted by
`tipsEmployeeId` when creating an invoice, and is echoed back in
`tipsInfo.employeeId` on invoice status.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringEmployeeList` with readonly `list`               |

Rejects with `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

## acquiring.wallet.list

```ts
acquiring.wallet.list(
  input: ListAcquiringWalletCardsInput,
  options?: RequestOptions,
): Promise<AcquiringWallet>
```

Loads `GET /api/merchant/wallet` for one payer's `walletId`. Monobank enables
tokenization per merchant.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringWallet` with readonly `wallet`                   |

Rejects with the four standard SDK error classes. Input validation runs before
Fetch.

## acquiring.wallet.pay

```ts
acquiring.wallet.pay(
  input: PayWithCardTokenInput,
  options?: RequestOptions,
): Promise<AcquiringCardPayment>
```

Charges a stored card token through `POST /api/merchant/wallet/payment`.
Amounts are integer minor currency units. When Monobank requires 3-D Secure the
result carries `tdsUrl`, and the payer must complete authentication there
before the payment reaches a final status.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Retries        | Never; the request moves money                           |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `AcquiringCardPayment`                                   |

Rejects with the four standard SDK error classes. Input validation runs before
Fetch.

## acquiring.wallet.deleteCard

```ts
acquiring.wallet.deleteCard(
  input: DeleteAcquiringWalletCardInput,
  options?: RequestOptions,
): Promise<void>
```

Removes a tokenized card through `DELETE /api/merchant/wallet/card`. Monobank
acknowledges with an empty payload, so the method resolves to `undefined`.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Retries        | Never; the request mutates stored payer data             |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `void`                                                   |

Rejects with `MonobankApiError`, `MonobankNetworkError`, or
`MonobankValidationError`. Input validation runs before Fetch.

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
cashiers, so **a cashier returned by `acquiring.qr.list()` can still fail with
status 404** — handle that as an expected outcome, not an error condition.

Monobank documents `invoiceId` as present only while an amount is set on the
cashier; `amount` and `ccy` may be omitted for the same reason, so treat all
three as absent unless present. A successful response may therefore carry
`shortQrId` alone. `amount` is an integer minor currency unit and `ccy` is an
ISO 4217 numeric code. Pass the cashier's `qrId`, not its `shortQrId`; `qrId`
must be a nonempty string without surrounding whitespace.

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

| Field              | Type                  | Required | Meaning                                                |
| ------------------ | --------------------- | -------- | ------------------------------------------------------ |
| `amount`           | `number`              | Yes      | Integer payment amount in minor units                  |
| `ccy`              | `number`              | No       | Integer numeric ISO 4217 code                          |
| `merchantPaymInfo` | `MerchantPaymentInfo` | No       | Order reference, description, basket, emails, metadata |
| `redirectUrl`      | `string`              | No       | Payer redirect target for success and failure alike    |
| `successUrl`       | `string`              | No       | Payer redirect target after a successful payment       |
| `failUrl`          | `string`              | No       | Payer redirect target after a failed payment           |
| `webHookUrl`       | `string`              | No       | Invoice-status callback target                         |
| `validity`         | `number`              | No       | Integer lifetime in seconds                            |
| `paymentType`      | `InvoicePaymentType`  | No       | `"debit"`, `"hold"`, or `"verification"`               |
| `saveCardData`     | object                | No       | Optional card-tokenization request                     |
| `displayType`      | `InvoiceDisplayType`  | No       | `"iframe"` to receive a widget link                    |
| `withAppUrl`       | `boolean`             | No       | Adds `appUrl`, a `monobank://` deeplink, to the result |

Monobank documents `successUrl` and `failUrl` as **disabled by default** — a
merchant has to ask support to enable them, and until then the values have no
effect and `redirectUrl` handles both outcomes.

`paymentType: "verification"` checks a card without moving money and is rejected
before Fetch unless `amount` is `0` and `saveCardData.saveCard` is `true`, both
of which Monobank documents as mandatory for it. `withAppUrl` is documented as
unsupported for QR and verification payments; that is stated rather than enforced
here, because the documentation does not say such a request fails.

`merchantPaymInfo.metadata` carries arbitrary merchant key-value pairs and
`merchantPaymInfo.basketOrder[].splitReceiverId` names a split-payment receiver.
Both appear only in Monobank's request sample, so `metadata` values are typed as
`unknown` and forwarded as given rather than narrowed to the sample's strings.

Returns `{ invoiceId, pageUrl }`, plus `appUrl` when `withAppUrl` was sent. This
mutating request is never retried. Throws the four standard SDK error classes;
input validation happens before Fetch.

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

A receipt exists only once an invoice has been paid. **Requesting one for an
unpaid invoice fails with `MonobankApiError` and status 400**, using the same
generic invalid-parameter status Monobank returns for a malformed request, so
the status alone does not tell the two apart. Handle it as an expected outcome.

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

## invoices.payDirect

```ts
acquiring.invoices.payDirect(
  input: PayInvoiceDirectInput,
  options?: RequestOptions,
): Promise<AcquiringCardPayment>
```

Charges raw card details through `POST /api/merchant/invoice/payment-direct`.

> **PCI DSS.** `cardData` carries a primary account number, expiry, and CVV.
> Handling those values places the calling system in PCI DSS scope. Collect and
> transmit them only from certified infrastructure, never log or persist them,
> and confirm your obligations before shipping. Monobank enables this endpoint
> per merchant. Prefer `invoices.create()` or `wallet.pay()` where possible.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Retries        | Never; the request moves money                           |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `AcquiringCardPayment`                                   |

Rejects with the four standard SDK error classes. Validation runs before Fetch
and names only the offending field, never its value, so card details never
reach public error state.

## invoices.syncPayment

```ts
acquiring.invoices.syncPayment(
  input: SyncInvoicePaymentInput,
  options?: RequestOptions,
): Promise<Invoice>
```

Settles one payment through `POST /api/merchant/invoice/sync-payment` and
returns the resulting invoice. Supply exactly one payment container: `cardData`
for raw card and 3-D Secure values, or a decrypted `applePay` or `googlePay`
crypto container. Supplying none, or more than one, fails validation before
Fetch.

> **PCI DSS.** Every accepted container is cardholder or cryptogram material.
> The obligations described for `invoices.payDirect()` apply here too.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Retries        | Never; the request moves money                           |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `Invoice`                                                |

Rejects with the four standard SDK error classes.

## acquiring.subscriptions.create

```ts
acquiring.subscriptions.create(
  input: CreateAcquiringSubscriptionInput,
  options?: RequestOptions,
): Promise<NewAcquiringSubscription>
```

Calls `POST /api/merchant/subscription/create`. The payer authorizes the
subscription on the returned `pageUrl`, which is where the first payment
happens; Monobank takes later charges itself on the `interval` cadence.

`amount` is an integer minor currency unit and `ccy` an ISO 4217 numeric code
defaulting to 980. `interval` is a count followed by `d`, `w`, `m`, or `y` —
`"1d"`, `"2w"`, `"1m"`, `"1y"` — and is rejected before Fetch when it does not
match that form. `validity` bounds the payment page's life in seconds; Monobank
defaults to 24 hours and **silently truncates anything above 30 days**, so a
longer value is neither an error nor honored. `webHookUrls.chargeUrl` receives
each recurring charge and `webHookUrls.statusUrl` each subscription state
change.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Rate limit     | No endpoint-specific limit is encoded or enforced        |
| Retries        | Never retried; the request creates merchant state        |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `NewAcquiringSubscription`                               |

Rejects with `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`. Input
validation runs before Fetch and rejects the returned promise rather than
throwing synchronously.

```ts
const subscription = await acquiring.subscriptions.create({
  amount: 4_200,
  interval: "1m",
  webHookUrls: { chargeUrl: "https://example.test/mono/charge" },
});

console.log(subscription.subscriptionId, subscription.pageUrl);
```

## acquiring.subscriptions.getStatus

```ts
acquiring.subscriptions.getStatus(
  input: GetAcquiringSubscriptionStatusInput,
  options?: RequestOptions,
): Promise<AcquiringSubscription>
```

Loads `GET /api/merchant/subscription/status`.

**Monobank documents this response with a sample rather than a schema**, so only
`subscriptionId` and `status` are guaranteed: `endDate` and `cancellationDesc`
appear once a subscription ends, `walletData` once a card is attached, and
`summary` carries the settled and failed charge counts when present. `status` is
typed as `string` because the documentation states no closed set of values for
it. `walletData.cardToken` authorizes further charges, so treat it as
credential material: never log, serialize, or persist it outside secured
merchant storage.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringSubscription`                                    |

Rejects with `MonobankApiError` (including `404` for an unknown subscription),
`MonobankNetworkError`, `MonobankResponseValidationError`, or
`MonobankValidationError`.

```ts
const subscription = await acquiring.subscriptions.getStatus({
  subscriptionId: "s2_AbrCdXyZ13",
});

console.log(subscription.status, subscription.summary?.totalPaid);
```

## acquiring.subscriptions.list

```ts
acquiring.subscriptions.list(
  input: ListAcquiringSubscriptionsInput,
  options?: RequestOptions,
): Promise<AcquiringSubscriptionList>
```

Loads `GET /api/merchant/subscription/list`.

`dateFrom` is **required by Monobank** and bounds the window; `dateTo` defaults
to the current time. Both accept a `Date`, serialized with `toISOString()`, or
an RFC-3339 string forwarded unchanged so an offset such as
`2024-06-26T18:12:44+03:00` survives. Unlike `acquiring.statements.get`, these
parameters are RFC-3339 rather than Unix seconds. A reversed window is rejected
before Fetch, because Monobank answers one with an empty result instead of an
error. `limit` defaults to 20 and `page` is the 1-based index. `status` narrows
the page to `AcquiringSubscriptionStatus.Active` or
`AcquiringSubscriptionStatus.Cancelled`. `pagination` may be absent.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringSubscriptionList`                                |

Rejects with `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const page = await acquiring.subscriptions.list({
  dateFrom: new Date("2024-06-01T00:00:00Z"),
  status: AcquiringSubscriptionStatus.Active,
});

for (const subscription of page.list) {
  console.log(subscription.subscriptionId, subscription.nextChargeDate);
}
```

## acquiring.subscriptions.getPayments

```ts
acquiring.subscriptions.getPayments(
  input: GetAcquiringSubscriptionPaymentsInput,
  options?: RequestOptions,
): Promise<AcquiringSubscriptionPaymentList>
```

Loads `GET /api/merchant/subscription/payments`, the charge history of one
subscription. `dateFrom` is required and the window rules match
`acquiring.subscriptions.list`. `amount` is an integer minor currency unit,
`status` is typed as `string` because Monobank documents no closed set of
charge outcomes, and `pagination` may be absent.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringSubscriptionPaymentList`                         |

Rejects with `MonobankApiError` (including `404` for an unknown subscription),
`MonobankNetworkError`, `MonobankResponseValidationError`, or
`MonobankValidationError`.

```ts
const history = await acquiring.subscriptions.getPayments({
  dateFrom: new Date("2024-06-01T00:00:00Z"),
  subscriptionId: "s2_AbrCdXyZ13",
});

console.log(history.payments.length, history.pagination?.totalItems);
```

## acquiring.subscriptions.edit

```ts
acquiring.subscriptions.edit(
  input: EditAcquiringSubscriptionInput,
  options?: RequestOptions,
): Promise<void>
```

Calls `POST /api/merchant/subscription/edit`. Monobank documents `cancel` as the
only action, exposed as `AcquiringSubscriptionAction.Cancel`. Supplying
`refundAmount` refunds that many minor currency units as part of the
cancellation, so cancelling and refunding are one request; omitting it refunds
nothing. Monobank answers with an empty payload, so this resolves to
`undefined`.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Rate limit     | No endpoint-specific limit is encoded or enforced        |
| Retries        | Never retried; the request mutates merchant state        |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `void`                                                   |

Rejects with `MonobankApiError` (including `404` for an unknown subscription),
`MonobankNetworkError`, or `MonobankValidationError`.

```ts
await acquiring.subscriptions.edit({
  action: AcquiringSubscriptionAction.Cancel,
  refundAmount: 4_200,
  subscriptionId: "s2_AbrCdXyZ13",
});
```

## acquiring.subscriptions.remove

```ts
acquiring.subscriptions.remove(
  input: RemoveAcquiringSubscriptionInput,
  options?: RequestOptions,
): Promise<void>
```

Calls `POST /api/merchant/subscription/remove`, deactivating a subscription so
Monobank takes no further charges. Use `acquiring.subscriptions.edit()` instead
when the cancellation should also refund. Monobank answers with an empty
payload, so this resolves to `undefined`.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Rate limit     | No endpoint-specific limit is encoded or enforced        |
| Retries        | Never retried; the request mutates merchant state        |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `void`                                                   |

Rejects with `MonobankApiError` (including `404` for an unknown subscription),
`MonobankNetworkError`, or `MonobankValidationError`.

```ts
await acquiring.subscriptions.remove({ subscriptionId: "s2_AbrCdXyZ13" });
```

## acquiring.monopay.listKeys

```ts
acquiring.monopay.listKeys(
  options?: RequestOptions,
): Promise<MonopaySigningKeyList>
```

Loads `GET /api/merchant/monopay/pubkey-list`, the public keys Monobank holds for
verifying monopay button order signatures. Entries arrive under `result`, not
`list`, as Monobank documents. Only `keyId` is required on an entry, because this
response is documented with a sample rather than a schema.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `MonopaySigningKeyList`                                    |

Rejects with `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const keys = await acquiring.monopay.listKeys();

for (const key of keys.result) {
  console.log(key.keyId, key.keyName, key.expiresAt);
}
```

## acquiring.monopay.importKey

```ts
acquiring.monopay.importKey(
  input: ImportMonopaySigningKeyInput,
  options?: RequestOptions,
): Promise<ImportedMonopaySigningKey>
```

Calls `POST /api/merchant/monopay/pubkey-import`. `keyValue` is the
**Base64-encoded public half** of a merchant-owned key pair; the private half
signs widget order data and must never enter this SDK or its logs. `keyName` is a
merchant-chosen label and `expiresAt` accepts a `Date`, serialized with
`toISOString()`, or an RFC-3339 string forwarded unchanged.

The validation error names the offending field without repeating its value, so an
imported key never reaches public error state.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Rate limit     | No endpoint-specific limit is encoded or enforced        |
| Retries        | Never retried; the request mutates merchant state        |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `ImportedMonopaySigningKey`                              |

Rejects with `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const imported = await acquiring.monopay.importKey({
  keyName: "widget-2026",
  keyValue: base64PublicKey,
});

console.log(imported.result.keyId);
```

## acquiring.monopay.deleteKey

```ts
acquiring.monopay.deleteKey(
  input: DeleteMonopaySigningKeyInput,
  options?: RequestOptions,
): Promise<void>
```

Calls `POST /api/merchant/monopay/pubkey-delete`. **Deleting a key invalidates
every widget signature made with it**, so confirm the key is unused first.
Monobank answers with an empty payload, so this resolves to `undefined`.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Rate limit     | No endpoint-specific limit is encoded or enforced        |
| Retries        | Never retried; the request mutates merchant state        |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `void`                                                   |

Rejects with `MonobankApiError` (including `404` for an unknown key),
`MonobankNetworkError`, or `MonobankValidationError`.

```ts
await acquiring.monopay.deleteKey({ keyId: "28F91hHGtzoSFJ" });
```

## acquiring.t2p.listTerminals

```ts
acquiring.t2p.listTerminals(
  options?: RequestOptions,
): Promise<AcquiringT2pTerminalList>
```

Loads `GET /api/merchant/t2p/terminal/list`, the tap-to-phone terminals
registered to the merchant. Only `terminal` is required on an entry.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringT2pTerminalList`                                 |

Rejects with `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const terminals = await acquiring.t2p.listTerminals();
```

## acquiring.t2p.getPaymentStatus

```ts
acquiring.t2p.getPaymentStatus(
  input: GetAcquiringT2pPaymentStatusInput,
  options?: RequestOptions,
): Promise<AcquiringT2pPayment>
```

Loads `GET /api/merchant/t2p/terminal/payment/external/status` by the
`externalPaymentId` the integrator assigned when creating the payment. Monobank
keeps these payments for **90 days** and answers `404` afterwards, so treat a miss
on an older payment as expected rather than exceptional.

Three fields follow their own conventions here and are modelled as documented
rather than normalized:

| Field          | Shape                        | Elsewhere in this API        |
| -------------- | ---------------------------- | ---------------------------- |
| `ccy`          | alphabetic, `"UAH"`          | numeric ISO 4217 code, `980` |
| `dataTime`     | `"2026-04-21 23:01:54"`      | RFC-3339 or Unix seconds     |
| `errorMessage` | explicitly `null` on success | field omitted when not set   |

`maskedPan` carries the masked card number while `cardMask` carries the scheme
name, which reads as transposed but is preserved as upstream spells it. Only
`status` is required.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringT2pPayment`                                      |

Rejects with `MonobankApiError` (including `404` past 90 days),
`MonobankNetworkError`, `MonobankResponseValidationError`, or
`MonobankValidationError`.

```ts
const payment = await acquiring.t2p.getPaymentStatus({
  externalPaymentId: "18247112-4eac-4465-aa3c-c42c18f601eb",
});

if (payment.errorMessage !== null && payment.errorMessage !== undefined) {
  console.error(payment.errorMessage, payment.responseCode);
}
```

## acquiring.split.listReceivers

```ts
acquiring.split.listReceivers(
  options?: RequestOptions,
): Promise<AcquiringSplitReceiverList>
```

Loads `GET /api/merchant/split-receiver/list`. A returned `splitReceiverId` is
what `merchantPaymInfo.basketOrder[].splitReceiverId` expects on
`acquiring.invoices.create()`. Each entry carries the receiver's `edrpou` state
registry code, which identifies a real business, so treat the list as counterparty
data rather than public reference data. Only `splitReceiverId` is required.

| Property       | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                               |
| Rate limit     | No endpoint-specific limit is encoded or enforced          |
| Retries        | Eligible when a retry policy is configured                 |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds   |
| Cancellation   | `options.signal` cancels the active request or retry delay |
| Returns        | `AcquiringSplitReceiverList`                               |

Rejects with `MonobankApiError`, `MonobankNetworkError`,
`MonobankResponseValidationError`, or `MonobankValidationError`.

```ts
const receivers = await acquiring.split.listReceivers();
```

## acquiring.pos.cancelTransaction

```ts
acquiring.pos.cancelTransaction(
  input: CancelAcquiringPosTransactionInput,
  options?: RequestOptions,
): Promise<AcquiringPosCancellation>
```

Calls `POST /api/merchant/pos-transaction-cancel`, refunding part or all of a POS
transaction identified by its `rrn`. `amount` is in minor currency units and may
not exceed what the transaction has left after earlier refunds; only Monobank can
evaluate that, so the SDK checks the shape and lets Monobank reject an
over-refund.

A successful response acknowledges that the refund was **initiated**, not that it
settled. This request moves money and is never retried — retrying could refund
twice.

| Property       | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Authentication | Acquiring token in `X-Token`                             |
| Rate limit     | No endpoint-specific limit is encoded or enforced        |
| Retries        | Never retried; the request mutates merchant state        |
| Timeout        | `timeoutMs` per attempt; defaults to 10,000 milliseconds |
| Cancellation   | `options.signal` cancels the active request              |
| Returns        | `AcquiringPosCancellation`                               |

Rejects with `MonobankApiError` (including an over-refund or unknown RRN),
`MonobankNetworkError`, `MonobankResponseValidationError`, or
`MonobankValidationError`.

```ts
const refund = await acquiring.pos.cancelTransaction({
  amount: 4_200,
  rrn: "060189181768",
});

console.log(refund.status, refund.tranId);
```

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

## corporate.access.request

```ts
corporate.access.request(
  input?: RequestCorporateAccessInput,
  options?: RequestOptions,
): Promise<CorporateTokenRequest>
```

Initializes a request for access to one client's data, over the signed
`POST /personal/auth/request` endpoint.

| Input         | Type     | Contract                                                                                                                              |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `callbackUrl` | `string` | Optional absolute HTTP(S) address, sent as `X-Callback`; Monobank issues a GET to it carrying `X-Request-Id` once the client approves |

Show the returned `acceptUrl` to the client as a QR code, or redirect a mobile
client to it. Keep `tokenRequestId`: it identifies the grant in
`corporate.access.check` and in every later delegated read.

Both response fields are optional, because Monobank's `TokenRequest` schema
declares no `required` array.

Signed with the `X-Time` and URL payload; no `X-Request-Id` is sent. Mutating
request; never retried.

## corporate.access.check

```ts
corporate.access.check(
  input: CheckCorporateAccessInput,
  options?: RequestOptions,
): Promise<void>
```

Checks whether the client granted the requested access, over the signed
`GET /personal/auth/request` endpoint.

| Input       | Type     | Contract                                                  |
| ----------- | -------- | --------------------------------------------------------- |
| `requestId` | `string` | `tokenRequestId` from `request()`; sent as `X-Request-Id` |

Resolves when access is granted. Monobank answers with an empty body, so there
is no value to return; the status distinguishes the outcomes:

| Status | Meaning                              |
| ------ | ------------------------------------ |
| 200    | Access granted; the promise resolves |
| 401    | The client has not approved yet      |
| 404    | No such access request               |

Signed with the `X-Time`, `X-Request-Id`, and URL payload — the first operation
to use that variant. Safe GET; eligible for configured retries, and each retry
is signed again.

These operations read another person's banking data. The client grants access, it
covers only the permissions the company registered, and the client can revoke it
at any time.

## corporate.clients.getInfo

```ts
corporate.clients.getInfo(
  input: GetCorporateClientInfoInput,
  options?: RequestOptions,
): Promise<ClientInfo>
```

Reads the granted client's identity and accounts over the signed
`GET /personal/client-info` endpoint.

| Input       | Type     | Contract                                 |
| ----------- | -------- | ---------------------------------------- |
| `requestId` | `string` | Grant identifier from `access.request()` |

Returns the same `ClientInfo` the Personal client returns — the wire contract is
identical, so `clientInfoSchema` is reused rather than forked. Signed with the
`X-Time`, `X-Request-Id`, and URL payload. Safe GET; eligible for configured
retries. Monobank limits this endpoint to one request per 60 seconds.

An unapproved or revoked grant surfaces as `MonobankApiError`.

## corporate.clients.getStatements

```ts
corporate.clients.getStatements(
  input: GetCorporateClientStatementsInput,
  options?: RequestOptions,
): Promise<readonly StatementItem[]>
```

Reads the granted client's statements over the signed
`GET /personal/statement/{account}/{from}/{to}` endpoint.

| Input       | Type            | Contract                                                       |
| ----------- | --------------- | -------------------------------------------------------------- |
| `requestId` | `string`        | Grant identifier from `access.request()`                       |
| `from`      | `UnixTimeInput` | Inclusive window start as Unix seconds or a `Date`             |
| `account`   | `string`        | Optional account or jar identifier; omission defaults to `0`   |
| `to`        | `UnixTimeInput` | Optional inclusive window end; omission means the current time |

The inclusive window must not exceed **2,682,000** seconds, the same limit the
Personal endpoint enforces, and the signed payload covers the encoded account and
both timestamps. Returns the same `StatementItem` values as the Personal client,
newest first. Safe GET; eligible for configured retries.

## corporate.documents.requestSigning

```ts
corporate.documents.requestSigning(
  input: RequestDocumentSigningInput,
  options?: RequestOptions,
): Promise<DocumentSigningRequest>
```

Creates a monoКЕП request to sign one to ten documents, over the signed
`POST /personal/signature/create` endpoint. A request is valid for **three days**.

| Input         | Type                              | Contract                                                 |
| ------------- | --------------------------------- | -------------------------------------------------------- |
| `documents`   | `readonly SigningDocumentInput[]` | One to ten documents; each requires `name` and `hash`    |
| `oneSigner`   | `boolean`                         | Optional; Monobank defaults it to `true`                 |
| `callbackUrl` | `string`                          | Optional address monoКЕП notifies about signing progress |

Each document takes `name` and `hash`, plus optional `type`
(`SigningDocumentType`) and `link`.

> [!IMPORTANT]
> `hash` is the document digest as HEX under **ГОСТ 34.311-95**. Neither Web
> Crypto nor `node:crypto` implements that algorithm, so the SDK never computes
> or verifies it — you supply the value. A SHA-256 hex string is the same length
> and yields a well-formed request that is silently wrong.

Returns `requestId`, used by the two calls below, and `deeplink`, which the
signatory opens in the Monobank app. Both are marked required upstream. Mutating
request; never retried.

## corporate.documents.getSigningStatus

```ts
corporate.documents.getSigningStatus(
  input: GetDocumentSigningStatusInput,
  options?: RequestOptions,
): Promise<DocumentSigningStatus>
```

Loads signing progress over the signed `GET /personal/signature/status` endpoint,
with `requestId` carried as a query parameter and therefore covered by the signed
payload.

Each document reports an optional `status` — one of `DocumentSigningState.Pending`,
`.Signed`, `.Canceled`, `.Expired` — and an optional `signers` array of up to 20
signatories, each with `name`, `tin`, `certSerial`, a Base64 `signature`, `date`,
and optional `edrpou`, `company`, and `post`.

Monobank's top-level `required` array lists `status`, `name`, and `hash`, but those
properties are defined on the document items rather than the response, so nothing
is treated as required at the top level. Safe GET; eligible for configured retries.

## corporate.documents.cancelSigning

```ts
corporate.documents.cancelSigning(
  input: CancelDocumentSigningInput,
  options?: RequestOptions,
): Promise<void>
```

Cancels a signing request before its three-day validity expires, over the signed
`DELETE /personal/signature/cancel` endpoint. Resolves with no value. Never
retried, structurally as well as by its flag, because the retry policy admits only
GET.

Monobank's specification declares no parameters for the status and cancellation
operations — the identifier appears only inside the literal path string — so this
SDK sends them with the same signed headers as the create call and states that as
an assumption.

## corporate.company.register

```ts
corporate.company.register(
  input: RegisterCorporateCompanyInput,
  options?: RequestOptions,
): Promise<CorporateRegistration>
```

Submits the company authorization application over the signed
`POST /personal/auth/registration` endpoint. Runs **before a service key
exists**: the request is signed with `X-Time` and the URL alone and sends no
`X-Key-Id`, so the client may be constructed with only `sign`.

All seven documented fields are required and must be non-blank:
`contactPerson`, `description`, `email`, `logo` (base64 image), `name`,
`phone`, and `pubkey` (base64 PEM of the secp256k1 public key).

Mutating request; never retried. The response documents no required field, so
`CorporateRegistration.status` is optional.

## corporate.company.getRegistrationStatus

```ts
corporate.company.getRegistrationStatus(
  input: GetCorporateRegistrationStatusInput,
  options?: RequestOptions,
): Promise<CorporateRegistrationStatusResult>
```

Polls the application status over the signed
`POST /personal/auth/registration/status` endpoint, identified by the same
base64 `pubkey` the application was submitted with. Also runs before a key
exists and sends no `X-Key-Id`.

Returns `status` — one of `CorporateRegistrationStatus.New`, `.Declined`, or
`.Approved` — and `keyId`, which is what every later Corporate request
authenticates with. POST upstream; never retried.

## corporate.company.getSettings

```ts
corporate.company.getSettings(
  input: GetCorporateSettingsInput,
  options?: RequestOptions,
): Promise<CorporateSettings>
```

Reads the company data Monobank holds for the configured Corporate key from the
signed `GET /personal/corp/settings` endpoint.

| Input       | Type     | Contract                                                        |
| ----------- | -------- | --------------------------------------------------------------- |
| `requestId` | `string` | Nonempty printable ASCII without spaces; sent as `X-Request-Id` |

Signed with the `X-Time` and URL payload; `X-Request-Id` is sent but deliberately
**not** signed, as Monobank documents for this endpoint.

Safe GET; eligible for configured retries, and each retry is signed again.

| Response field | Type     | Notes                                                     |
| -------------- | -------- | --------------------------------------------------------- |
| `name`         | `string` | Company name                                              |
| `permission`   | `string` | Granted permissions, one letter each, for example `"psf"` |
| `pubkey`       | `string` | Registered secp256k1 public key PEM, base64 encoded       |
| `logo`         | `string` | Company logo image, base64 encoded                        |
| `webhook`      | `string` | Optional transaction callback address                     |

Monobank lists `id` as required but never defines the property or gives an
example, so its type is unknown. It is left unmodeled rather than guessed; the
loose response object still preserves it at runtime.

```ts
const settings = await corporate.company.getSettings({
  requestId: "corp-request-id",
});
```

Throws `MonobankValidationError` when `requestId` is invalid or the signer fails,
`MonobankApiError` on a non-success status, `MonobankNetworkError` on transport
failure, and `MonobankResponseValidationError` when the payload does not match
the schema.

## corporate.company.setWebhook

```ts
corporate.company.setWebhook(
  input: SetCorporateWebhookInput,
  options?: RequestOptions,
): Promise<void>
```

Sets or removes the webhook that receives client payment updates, over the
signed `POST /personal/corp/webhook` endpoint.

| Input        | Type     | Contract                                                        |
| ------------ | -------- | --------------------------------------------------------------- |
| `requestId`  | `string` | Nonempty printable ASCII without spaces; sent as `X-Request-Id` |
| `webHookUrl` | `string` | Absolute HTTP(S) URL, or an empty string to remove the webhook  |

Monobank sends a **test POST** to the URL during this call and fails the call
unless it answers `200 OK`, so the mutation can fail for reasons outside the
request itself. Signed with the `X-Time` and URL payload; `X-Request-Id` is
sent but deliberately not signed. Requires a configured `keyId`. Never
retried. Removal via an empty string mirrors the Personal endpoint and is not
explicitly documented for this one.

## Retry policy

`RetryOptions` gates retries; omitting it disables them entirely.

| Field                  | Type                | Default                       | Meaning                                  |
| ---------------------- | ------------------- | ----------------------------- | ---------------------------------------- |
| `maxAttempts`          | `number`            | Required                      | Total attempts including the first       |
| `baseDelayMs`          | `number`            | Required                      | Initial delay before exponential backoff |
| `maxDelayMs`           | `number`            | Required                      | Ceiling for any computed delay           |
| `retryableStatusCodes` | `readonly number[]` | `defaultRetryableStatusCodes` | Statuses eligible for retry              |

`defaultRetryableStatusCodes` is `[429, 500, 502, 503, 504]` and is exported for
comparison and extension.

Two limits are structural rather than configurable:

- **Only safe GET requests are retried.** Every mutating method is excluded by the
  policy's method check as well as by its own `retryable` flag.
- **Timeouts are never retried.** A configured `timeoutMs` is the caller's ceiling
  for one attempt, so exceeding it fails the request rather than spending the
  budget again. This applies to Corporate signing too, which runs inside the same
  attempt window.

`Retry-After` is honored when present and suppresses the retry when the requested
delay exceeds `maxDelayMs`.

### Narrowing the set

Monobank documents `/personal/client-info` and `/personal/statement` at **one
request per 60 seconds**. A `429` there means the minute's quota is already spent,
so a short backoff cannot succeed and each attempt spends more of it:

```ts
const personal = new MonobankPersonalClient({
  retry: {
    baseDelayMs: 1_000,
    maxAttempts: 3,
    maxDelayMs: 8_000,
    retryableStatusCodes: [500, 502, 503, 504],
  },
  token: "validated-personal-token",
});
```

An empty list, a non-integer, or a status outside 400–599 is rejected at
construction with `MonobankValidationError`.

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

| Export                                 | Validates                             |
| -------------------------------------- | ------------------------------------- |
| `accountSchema`                        | One Personal account                  |
| `acquiringCardPaymentSchema`           | Wallet or direct card-payment result  |
| `acquiringEmployeeListSchema`          | Acquiring employee-list response      |
| `acquiringEmployeeSchema`              | One Acquiring employee                |
| `acquiringWalletCardSchema`            | One tokenized wallet card             |
| `acquiringWalletSchema`                | Merchant wallet response              |
| `acquiringQrCashierListSchema`         | Acquiring QR cashier-list response    |
| `acquiringQrCashierSchema`             | One Acquiring QR cashier              |
| `acquiringQrDetailsSchema`             | Acquiring QR cashier details          |
| `acquiringStatementSchema`             | Acquiring statement response          |
| `acquiringStatementItemSchema`         | One Acquiring transaction             |
| `acquiringStatementCancellationSchema` | Nested Acquiring cancellation         |
| `acquiringSubmerchantListSchema`       | Acquiring submerchant-list response   |
| `acquiringSubmerchantSchema`           | One Acquiring submerchant             |
| `acquiringWebhookPublicKeySchema`      | Acquiring webhook key response        |
| `bankSyncSchema`                       | `/bank/sync` response                 |
| `clientInfoSchema`                     | `/personal/client-info` response      |
| `corporateRegistrationSchema`          | Corporate application acknowledgement |
| `corporateRegistrationStatusSchema`    | Corporate application status and key  |
| `corporateSettingsSchema`              | `/personal/corp/settings` response    |
| `corporateTokenRequestSchema`          | Delegated access-request response     |
| `documentSignatorySchema`              | One monoКЕП signatory                 |
| `documentSigningRequestSchema`         | Created monoКЕП signing request       |
| `documentSigningStatusSchema`          | monoКЕП signing progress              |
| `signingDocumentSchema`                | One monoКЕП document with its state   |
| `currencyRateSchema`                   | One exchange-rate item                |
| `currencyRatesSchema`                  | `/bank/currency` response array       |
| `jarSchema`                            | One Personal jar                      |
| `managedAccountSchema`                 | One delegated FOP account             |
| `managedClientSchema`                  | One delegated FOP client              |
| `merchantDetailsSchema`                | `/api/merchant/details` response      |
| `newInvoiceSchema`                     | Create-invoice response               |
| `invoiceStatusSchema`                  | Invoice status or webhook payload     |
| `cancelInvoiceResponseSchema`          | Invoice cancellation response         |
| `finalizeInvoiceResponseSchema`        | Hold finalization response            |
| `receiptSchema`                        | Invoice receipt response              |
| `invoiceFiscalChecksSchema`            | Invoice fiscal checks response        |
| `statementItemSchema`                  | One statement item                    |
| `statementItemsSchema`                 | Statement response array              |
| `personalWebhookEventSchema`           | Incoming Personal statement event     |

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

| Export                           | Wire values                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `InvoicePaymentType`             | `debit`, `hold`                                                              |
| `AcquiringPaymentScheme`         | `full`, `bnpl_later_30`, `bnpl_parts_4`                                      |
| `AcquiringQrAmountType`          | `client`, `fix`, `merchant`                                                  |
| `AcquiringCardPaymentStatus`     | `processing`, `success`, `failure`                                           |
| `AcquiringPaymentInitiationKind` | `client`, `merchant`                                                         |
| `SyncPaymentPanType`             | `FPAN`, `DPAN`                                                               |
| `AcquiringStatementStatus`       | `hold`, `processing`, `success`, `failure`                                   |
| `InvoiceStatus`                  | `created`, `processing`, `hold`, `success`, `failure`, `reversed`, `expired` |
| `InvoiceCancellationStatus`      | `processing`, `success`, `failure`                                           |
| `InvoicePaymentSystem`           | `visa`, `mastercard`                                                         |
| `InvoicePaymentMethod`           | `pan`, `apple`, `google`, `monobank`, `wallet`, `direct`                     |
| `InvoiceWalletStatus`            | `new`, `created`, `failed`                                                   |
| `DiscountType`                   | `DISCOUNT`, `EXTRA_CHARGE`                                                   |
| `DiscountMode`                   | `PERCENT`, `VALUE`                                                           |
| `FiscalCheckType`                | `sale`, `return`                                                             |
| `FiscalCheckStatus`              | `new`, `process`, `done`, `failed`                                           |
| `FiscalizationSource`            | `checkbox`, `monopay`                                                        |

### Corporate values

| Export                        | Wire values                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `CorporateRegistrationStatus` | `New`, `Declined`, `Approved`                                                     |
| `DocumentSigningState`        | `pending`, `signed`, `canceled`, `expired`                                        |
| `SigningDocumentType`         | `pdf`, `doc`, `docx`, `odt`, `json`, `xml`, `html`, `png`, `jpg`, `jpeg`, `other` |

Monobank declares no `enum` for the registration `status` field and lists these
three values only in its prose description, so
`CorporateRegistrationStatusResult.status` is typed as `string`. Compare against
this const rather than relying on the response type to narrow.

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
| `ListAcquiringWalletCardsInput`          | Wallet identifier for listing tokenized cards                  |
| `DeleteAcquiringWalletCardInput`         | Card token to remove from a wallet                             |
| `PayWithCardTokenInput`                  | Stored-token charge amount, currency, and initiation           |
| `PayInvoiceDirectInput`                  | Raw card charge; PCI DSS material                              |
| `DirectPaymentCardData`                  | Raw PAN, expiry, and CVV; PCI DSS material                     |
| `SyncInvoicePaymentInput`                | Synchronous payment with exactly one container                 |
| `SyncPaymentCardData`                    | Card and 3-D Secure values; PCI DSS material                   |
| `SyncPaymentWalletContainer`             | Decrypted Apple Pay or Google Pay container                    |
| `SyncPaymentMerchantInfo`                | Order details for a synchronous payment                        |
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
| `CorporateSigner`                        | Injectable Corporate signing function returning `X-Sign`       |
| `CorporateSignatureInput`                | Payload and components handed to a Corporate signer            |
| `GetCorporateSettingsInput`              | Request identifier for a corporate settings read               |
| `RegisterCorporateCompanyInput`          | Company authorization application fields                       |
| `GetCorporateRegistrationStatusInput`    | Public key identifying an application to poll                  |
| `SetCorporateWebhookInput`               | Request identifier and Corporate webhook address               |
| `RequestCorporateAccessInput`            | Optional callback address for a delegated access request       |
| `CheckCorporateAccessInput`              | Request identifier for a delegated access check                |
| `GetCorporateClientInfoInput`            | Grant identifier for a delegated identity read                 |
| `GetCorporateClientStatementsInput`      | Grant identifier, account, and window for delegated statements |
| `StatementWindowInput`                   | Account and time window shared by both statement families      |
| `RequestDocumentSigningInput`            | Documents, signer policy, and callback for monoКЕП signing     |
| `SigningDocumentInput`                   | One document submitted for monoКЕП signing                     |
| `GetDocumentSigningStatusInput`          | Signing request identifier for a status read                   |
| `CancelDocumentSigningInput`             | Signing request identifier for a cancellation                  |
| `ResponseValidationIssue`                | Safe schema issue retained by validation errors                |
| `MonobankApiErrorOptions`                | Public API-error constructor data                              |
| `MonobankNetworkErrorOptions`            | Public network-error constructor data                          |
| `MonobankNetworkErrorReason`             | `"aborted" \| "network" \| "timeout"`                          |
| `MonobankResponseValidationErrorOptions` | Public response-validation constructor data                    |
| `MonobankValidationErrorOptions`         | Public input-validation constructor data                       |

Response types are inferred from their runtime schemas and exported from the
package root, including the Personal models plus `MerchantDetails`,
`AcquiringSubmerchant`, `AcquiringSubmerchantList`, `AcquiringEmployee`,
`AcquiringEmployeeList`, `AcquiringWallet`, `AcquiringWalletCard`,
`AcquiringCardPayment`, `AcquiringQrCashier`,
`AcquiringQrCashierList`, `AcquiringQrDetails`,
`AcquiringWebhookPublicKey`, `AcquiringStatement`, `AcquiringStatementItem`,
`AcquiringStatementCancellation`, `NewInvoice`, `Invoice`,
`InvoiceCancellation`, `InvoiceFinalization`, `InvoiceReceipt`,
`InvoiceFiscalChecks`, `CorporateSettings`, `CorporateRegistration`, and
`CorporateRegistrationStatusResult`, `CorporateTokenRequest`,
`DocumentSigningRequest`, `DocumentSigningStatus`, `SigningDocument`, and
`DocumentSignatory`.
