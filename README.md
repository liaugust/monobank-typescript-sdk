# @liaugust/monobank-sdk

[![npm version](https://img.shields.io/npm/v/%40liaugust%2Fmonobank-sdk?logo=npm)](https://www.npmjs.com/package/@liaugust/monobank-sdk)
[![CI](https://github.com/liaugust/monobank-typescript-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/liaugust/monobank-typescript-sdk/actions/workflows/ci.yml)
[![coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](vitest.config.ts)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A strict, runtime-validated TypeScript SDK for the Monobank API.

It spans five credential families — Public, Personal, Acquiring, Corporate, and
Покупка Частинами — and gives applications typed responses without trusting the
wire: every
successful JSON payload crosses a Zod validation boundary before it reaches your
code. Coverage of the Monobank API is partial; see [Coverage](#coverage).

> [!IMPORTANT]
> This is an unofficial community package. It is not developed, sponsored, or
> endorsed by Monobank.

## Contents

- [Why this SDK?](#why-this-sdk)
- [Coverage](#coverage)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [API at a glance](#api-at-a-glance)
  - [Acquiring merchant details](#acquiring-merchant-details)
  - [Acquiring submerchants](#acquiring-submerchants)
  - [Acquiring QR cashiers](#acquiring-qr-cashiers)
  - [Acquiring wallet and stored cards](#acquiring-wallet-and-stored-cards)
  - [Card-present payments and PCI DSS](#card-present-payments-and-pci-dss)
  - [Acquiring recurring payments](#acquiring-recurring-payments)
  - [monopay button signing keys](#monopay-button-signing-keys)
  - [Tap-to-phone terminals](#tap-to-phone-terminals)
  - [Split-payment receivers](#split-payment-receivers)
  - [POS refunds](#pos-refunds)
  - [Acquiring statements](#acquiring-statements)
  - [Public data](#public-data)
  - [Client information](#client-information)
  - [Statements](#statements)
  - [Webhooks](#webhooks)
  - [Corporate provider API](#corporate-provider-api)
  - [Покупка Частинами](#покупка-частинами)
- [Retries, timeouts, and cancellation](#retries-timeouts-and-cancellation)
- [Errors](#errors)
- [Runtime schemas](#runtime-schemas)
- [Data conventions](#data-conventions)
- [Testing applications](#testing-applications)
- [Project guides](#project-guides)
- [License](#license)

## Why this SDK?

- One package for five credential families, each with its own auth model
- Runtime validation for successful API responses and webhook payloads
- Strict TypeScript types with preserved JSDoc in published declarations
- ESM, CommonJS, and modern browser-bundler support
- Built-in Web Crypto authentication for Acquiring webhook signatures
- Fetch injection for tests, proxies, observability, and alternative runtimes
- Explicit cancellation, timeouts, and bounded retries for safe GET requests
- Credential-safe errors that do not retain tokens or raw Personal payloads
- Forward-compatible response objects that preserve additive upstream fields

## Coverage

All 63 operations Monobank documents are implemented, across two documentation
sites neither of which is a superset of the other:

- <https://monobank.ua/api-docs> — current; 46 operations
- <https://api.monobank.ua/docs/> — older Redoc specs; 17 further operations
  appear only here, covering all of Personal and Corporate

Coverage is measured against both sites and enumerated in
[issue #59](https://github.com/liaugust/monobank-typescript-sdk/issues/59). If
Monobank documents something this package lacks, that is a bug worth reporting
rather than an intentional omission.

## Requirements

- Node.js 22.12.0 or newer, or a modern browser with standard Fetch and Web Crypto
- No token for `MonobankPublicClient`
- A Monobank Personal API token for `MonobankPersonalClient`
- A Monobank Acquiring token for `MonobankAcquiringClient`
- A signing function for `MonobankCorporateClient`, plus an approved Corporate
  service key for every operation except registration
- A store identifier and shared secret for `MonobankInstallmentsClient`

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

| Call                                             | Authentication  | Result                              | Notes                                           |
| ------------------------------------------------ | --------------- | ----------------------------------- | ----------------------------------------------- |
| `publicApi.bank.getSync()`                       | None            | `BankSync`                          | Server time and public verification key         |
| `publicApi.currency.getRates()`                  | None            | `readonly CurrencyRate[]`           | Monobank may cache rates for five minutes       |
| `personal.client.getInfo()`                      | Personal token  | `ClientInfo`                        | Limited upstream to one request per 60 seconds  |
| `personal.statements.get(input)`                 | Personal token  | `readonly StatementItem[]`          | Maximum window: 2,682,000 seconds               |
| `personal.webhooks.set(input)`                   | Personal token  | `void`                              | Mutating request; never retried automatically   |
| `acquiring.merchant.getDetails()`                | Acquiring token | `MerchantDetails`                   | Merchant identity for the supplied token        |
| `acquiring.statements.get(input)`                | Acquiring token | `AcquiringStatement`                | Transaction statement ordered newest first      |
| `acquiring.submerchants.list()`                  | Acquiring token | `AcquiringSubmerchantList`          | Terminals available to supported merchants      |
| `acquiring.qr.list()`                            | Acquiring token | `AcquiringQrCashierList`            | QR cashiers registered for the merchant         |
| `acquiring.qr.getDetails(input)`                 | Acquiring token | `AcquiringQrDetails`                | State of one activated QR cashier               |
| `acquiring.qr.resetAmount(input)`                | Acquiring token | `void`                              | Clears a QR amount; never retried               |
| `acquiring.employees.list()`                     | Acquiring token | `AcquiringEmployeeList`             | Employees eligible to receive tips              |
| `acquiring.wallet.list(input)`                   | Acquiring token | `AcquiringWallet`                   | Cards tokenized for one payer                   |
| `acquiring.wallet.pay(input)`                    | Acquiring token | `AcquiringCardPayment`              | Charges a stored token; never retried           |
| `acquiring.wallet.deleteCard(input)`             | Acquiring token | `void`                              | Removes a token; never retried                  |
| `acquiring.invoices.payDirect(input)`            | Acquiring token | `AcquiringCardPayment`              | Raw card details; puts callers in PCI scope     |
| `acquiring.invoices.syncPayment(input)`          | Acquiring token | `Invoice`                           | Synchronous payment; never retried              |
| `acquiring.webhooks.getPublicKey()`              | Acquiring token | `AcquiringWebhookPublicKey`         | Key used to authenticate webhook signatures     |
| `acquiring.invoices.create(input)`               | Acquiring token | `NewInvoice`                        | Creates a hosted payment page                   |
| `acquiring.invoices.getStatus(input)`            | Acquiring token | `Invoice`                           | Safe GET; eligible for configured retries       |
| `acquiring.invoices.cancel(input)`               | Acquiring token | `InvoiceCancellation`               | Full or partial cancellation                    |
| `acquiring.invoices.remove(input)`               | Acquiring token | `void`                              | Invalidates an unpaid invoice                   |
| `acquiring.invoices.finalize(input)`             | Acquiring token | `InvoiceFinalization`               | Captures a held payment                         |
| `acquiring.invoices.getReceipt(input)`           | Acquiring token | `InvoiceReceipt`                    | Gets and optionally emails a receipt            |
| `acquiring.invoices.getFiscalChecks(input)`      | Acquiring token | `InvoiceFiscalChecks`               | Loads fiscalization results                     |
| `corporate.access.request(input?)`               | Corporate key   | `CorporateTokenRequest`             | Starts a client grant; never retried            |
| `corporate.access.check(input)`                  | Corporate key   | `void`                              | 401 means still pending; safe GET               |
| `corporate.clients.getInfo(input)`               | Corporate key   | `ClientInfo`                        | Granted client's identity; safe GET             |
| `corporate.clients.getStatements(input)`         | Corporate key   | `readonly StatementItem[]`          | Granted client's statements; safe GET           |
| `corporate.documents.requestSigning(input)`      | Corporate key   | `DocumentSigningRequest`            | monoКЕП request; never retried                  |
| `corporate.documents.getSigningStatus(input)`    | Corporate key   | `DocumentSigningStatus`             | Per-document state and signatories              |
| `corporate.documents.cancelSigning(input)`       | Corporate key   | `void`                              | DELETE; never retried                           |
| `corporate.company.register(input)`              | Corporate sign  | `CorporateRegistration`             | Pre-key application; never retried              |
| `corporate.company.getRegistrationStatus(input)` | Corporate sign  | `CorporateRegistrationStatusResult` | Pre-key status poll; returns the issued `keyId` |
| `corporate.company.getSettings(input)`           | Corporate key   | `CorporateSettings`                 | Signed request; company registration data       |
| `corporate.company.setWebhook(input)`            | Corporate key   | `void`                              | Bank test-POSTs the URL; never retried          |

See the [complete API reference](docs/API.md) for signatures, parameters,
returns, errors, retry behavior, data models, and focused examples.

Each client represents one credential boundary. Public calls use a token-free
client; Personal and Acquiring tokens cannot accidentally cross API families.
The Corporate client carries no token at all and signs every request instead.

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

### Acquiring QR cashiers

List the QR cashiers registered for the merchant, then read the current state of
one of them:

```ts
import { AcquiringQrAmountType } from "@liaugust/monobank-sdk";

const cashiers = await acquiring.qr.list();

for (const cashier of cashiers.list) {
  console.log(cashier.shortQrId, cashier.pageUrl);

  if (cashier.amountType === AcquiringQrAmountType.Merchant) {
    console.log("This cashier expects the merchant to set the amount");
  }
}

const [first] = cashiers.list;

if (first !== undefined) {
  const details = await acquiring.qr.getDetails({ qrId: first.qrId });

  if (details.invoiceId !== undefined) {
    console.log(details.invoiceId, details.amount, details.ccy);
  }
}
```

`cashiers.list` is readonly. `amountType` reports who sets the payment amount:
`merchant`, `client`, or `fix`. `getDetails()` takes the cashier's `qrId`, not
its `shortQrId`, and answers only for activated cashiers — so a cashier that
`list()` returned can still fail with `MonobankApiError` and status 404. Treat
that as an expected outcome. Monobank documents `invoiceId` as present only
while an amount is set on the cashier, and `amount` and `ccy` may be omitted for
the same reason, so a successful response may carry `shortQrId` alone. Amounts
are integer minor units. `list()` and `getDetails()` are safe GETs eligible for
configured retries. `getDetails()` rejects a `qrId` that is not a nonempty
string without surrounding whitespace with `MonobankValidationError`, before any
request is sent.

Clear an amount a merchant previously set on a cashier:

```ts
await acquiring.qr.resetAmount({ qrId: "XJ_DiM4rTd5V" });
```

`resetAmount()` mutates merchant state, so the SDK never retries it even when
the client has a retry policy. Monobank acknowledges the reset with an empty
payload, so the method resolves to `undefined`. It validates `qrId` exactly as
`getDetails()` does, before any request is sent.

### Acquiring wallet and stored cards

Merchants with tokenization enabled can list, charge, and remove the cards
stored for one payer:

```ts
import { AcquiringPaymentInitiationKind } from "@liaugust/monobank-sdk";

const wallet = await acquiring.wallet.list({ walletId: "wallet-42" });

for (const card of wallet.wallet) {
  console.log(card.cardToken, card.maskedPan);
}

const [card] = wallet.wallet;

if (card !== undefined) {
  const payment = await acquiring.wallet.pay({
    amount: 4_200,
    cardToken: card.cardToken,
    ccy: 980,
    initiationKind: AcquiringPaymentInitiationKind.Client,
  });

  if (payment.tdsUrl !== undefined) {
    console.log("Send the payer to 3-D Secure:", payment.tdsUrl);
  }

  await acquiring.wallet.deleteCard({ cardToken: card.cardToken });
}
```

`wallet.wallet` is readonly. Paying and removing a card both mutate state and
are never retried by the SDK.

### Card-present payments and PCI DSS

`acquiring.invoices.payDirect()` and `acquiring.invoices.syncPayment()` accept
raw cardholder data — primary account number, expiry, and CVV — or a decrypted
Apple Pay or Google Pay crypto container.

> **Handling these values places your system in PCI DSS scope.** Collect and
> transmit them only from infrastructure certified for cardholder data, never
> log or persist them, and confirm your obligations before shipping. Monobank
> enables both endpoints per merchant.

Prefer a hosted invoice from `acquiring.invoices.create()`, or
`acquiring.wallet.pay()` with a stored token, whenever the flow allows it —
neither exposes your system to raw card details.

```ts
const payment = await acquiring.invoices.payDirect({
  amount: 4_200,
  cardData: { cvv: "123", exp: "0642", pan: "4242424242424242" },
});
```

The SDK validates these inputs before any request and names only the offending
field in `MonobankValidationError`, never its value, so card details never
reach public error state. Both calls mutate state and are never retried.

### Acquiring recurring payments

Create a subscription, then let Monobank charge the saved card on a cadence. The
payer authorizes it on the returned `pageUrl`, which is where the first payment
happens:

```ts
import {
  AcquiringSubscriptionAction,
  AcquiringSubscriptionStatus,
} from "@liaugust/monobank-sdk";

const subscription = await acquiring.subscriptions.create({
  amount: 4_200,
  interval: "1m",
  webHookUrls: {
    chargeUrl: "https://example.test/mono/subscription/charge",
    statusUrl: "https://example.test/mono/subscription/status",
  },
});

console.log(subscription.subscriptionId, subscription.pageUrl);
```

`interval` is a count plus a unit — `"1d"`, `"2w"`, `"1m"`, `"1y"` — and any
other form is rejected before Fetch. `validity` bounds the payment page's life in
seconds; Monobank defaults to 24 hours and silently truncates anything above 30
days.

Read one subscription's state and its charge history. Windows here are RFC-3339,
not the Unix seconds `acquiring.statements.get()` takes, and `dateFrom` is
required:

```ts
const state = await acquiring.subscriptions.getStatus({
  subscriptionId: subscription.subscriptionId,
});

const history = await acquiring.subscriptions.getPayments({
  dateFrom: new Date("2026-08-01T00:00:00.000Z"),
  subscriptionId: subscription.subscriptionId,
});

const active = await acquiring.subscriptions.list({
  dateFrom: new Date("2026-08-01T00:00:00.000Z"),
  status: AcquiringSubscriptionStatus.Active,
});
```

Monobank documents these responses with samples rather than schemas, so only
`subscriptionId` and `status` are guaranteed on a subscription: `endDate` and
`cancellationDesc` appear once it ends, `walletData` once a card is attached, and
`pagination` may be absent from a page. `walletData.cardToken` authorizes further
charges — treat it as credential material and keep it out of logs.

Stopping a subscription has two forms. `edit()` cancels and can refund in the
same request; `remove()` only deactivates:

```ts
await acquiring.subscriptions.edit({
  action: AcquiringSubscriptionAction.Cancel,
  refundAmount: 4_200,
  subscriptionId: subscription.subscriptionId,
});

await acquiring.subscriptions.remove({
  subscriptionId: subscription.subscriptionId,
});
```

### monopay button signing keys

The monopay JavaScript widget signs order data with a merchant key pair. Manage
the public halves Monobank verifies against:

```ts
const keys = await acquiring.monopay.listKeys();

const imported = await acquiring.monopay.importKey({
  keyName: "widget-2026",
  keyValue: base64PublicKey,
});

await acquiring.monopay.deleteKey({ keyId: imported.result.keyId });
```

Entries arrive under `result`, not `list`, as Monobank documents. `keyValue` is
the **public** half only — the private key signs orders in your own
infrastructure and must never enter this SDK or its logs. Deleting a key
invalidates every widget signature made with it.

### Tap-to-phone terminals

List the merchant's tap-to-phone terminals and look up one payment by the
identifier your integrator assigned:

```ts
const terminals = await acquiring.t2p.listTerminals();

const payment = await acquiring.t2p.getPaymentStatus({
  externalPaymentId: "18247112-4eac-4465-aa3c-c42c18f601eb",
});
```

Monobank keeps these payments for 90 days and answers 404 afterwards. Three
fields break the conventions the rest of the API follows and are preserved as
documented: `ccy` is alphabetic (`"UAH"`) rather than a numeric ISO 4217 code,
`dataTime` is space-separated rather than RFC-3339, and `errorMessage` is
explicitly `null` on success. `maskedPan` holds the masked card number while
`cardMask` holds the scheme name.

### Split-payment receivers

```ts
const receivers = await acquiring.split.listReceivers();
```

A returned `splitReceiverId` is what
`merchantPaymInfo.basketOrder[].splitReceiverId` expects on
`acquiring.invoices.create()`. Each entry carries the receiver's `edrpou` state
registry code, which identifies a real business — treat the list as counterparty
data, not public reference data.

### POS refunds

```ts
const refund = await acquiring.pos.cancelTransaction({
  amount: 4_200,
  rrn: "060189181768",
});
```

`amount` may not exceed what the original transaction has left after earlier
refunds; only Monobank can evaluate that, so the SDK checks the shape and lets
Monobank reject an over-refund. A successful response means the refund was
_initiated_, not settled. This request moves money and is never retried —
retrying could refund twice.

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

`successUrl` and `failUrl` split the payer's return path by outcome, and
`displayType: InvoiceDisplayType.Iframe` returns a widget link instead of a
plain page. Monobank documents both redirects as **disabled by default** —
until support enables them, `redirectUrl` handles success and failure alike.
Sending `withAppUrl: true` adds `appUrl`, a `monobank://` deeplink, to the
result; it is not supported for QR or verification payments:

```ts
const widget = await acquiring.invoices.create({
  amount: 4_200,
  displayType: InvoiceDisplayType.Iframe,
  failUrl: "https://example.com/orders/42/failed",
  successUrl: "https://example.com/orders/42/paid",
  withAppUrl: true,
});

console.log(widget.pageUrl, widget.appUrl);
```

`paymentType: InvoicePaymentType.Verification` checks a card without moving
money. Monobank requires `amount: 0` and `saveCardData.saveCard: true` for it,
so the SDK rejects the call before Fetch when either is missing:

```ts
await acquiring.invoices.create({
  amount: 0,
  paymentType: InvoicePaymentType.Verification,
  saveCardData: { saveCard: true },
});
```

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

### Corporate provider API

The Corporate provider API does not use `X-Token`: every request is signed, and
Monobank issues the service key only after approving the company as a provider.

The key is **secp256k1**, which Web Crypto cannot sign with. Rather than add a
crypto dependency or a Node-only import that would break the browser build, the
SDK takes a signing function and never holds the private key:

```ts
import { createSign } from "node:crypto";

import { MonobankCorporateClient } from "@liaugust/monobank-sdk";

const privateKeyPem = process.env.MONOBANK_CORPORATE_PRIVATE_KEY ?? "";

const corporate = new MonobankCorporateClient({
  keyId: process.env.MONOBANK_CORPORATE_KEY_ID ?? "",
  sign: ({ payload }) =>
    createSign("SHA256")
      .update(payload)
      .sign({ dsaEncoding: "ieee-p1363", key: privateKeyPem }, "base64"),
});

const settings = await corporate.company.getSettings({
  requestId: "corp-request-id",
});
```

`dsaEncoding: "ieee-p1363"` produces the raw 64-byte `r || s` pair. Monobank's
documented `X-Sign` example decodes to exactly that, so DER is rejected.

Two things Monobank does not document:

- **The digest.** `SHA256` matches the wider ecosystem, but no hash is named. If
  the bank rejects a payload you believe is right, vary this first.
- **What `URL` means** in `Sign (X-Time | URL)`. This SDK signs the path with its
  query. The signer also receives `time`, `requestId`, and `url`, so you can
  rebuild the payload if the bank expects something else.

The signer runs once per attempt, because `X-Time` is signed and a retry must not
replay a stale timestamp. It runs **inside** the per-attempt `timeoutMs` budget:
a signing call that never settles fails with `MonobankNetworkError` and
`reason: "timeout"`, exactly as a hanging request does, and like any timeout it is
not retried.

A signer that throws or returns an empty string produces a
`MonobankValidationError` before Fetch runs, with no cause attached, because a
crypto library's error text can echo key material.

### Reading a client's data

`corporate.access.request()` starts a grant. Show the returned `acceptUrl` to the
client as a QR code, or redirect a mobile client to it, and keep
`tokenRequestId` — it identifies the grant in `check()` and in every later
delegated read. Pass `callbackUrl` to have Monobank notify you on approval.

`corporate.access.check({ requestId })` resolves once access is granted.
Monobank answers with an empty body, so there is no value to return: a pending
grant surfaces as `MonobankApiError` with status **401**, and an unknown request
as **404**.

These calls read another person's banking data. The client grants access, it
covers only the permissions the company registered, and the client can revoke it
at any time.

Once granted, `corporate.clients.getInfo({ requestId })` and
`corporate.clients.getStatements({ requestId, from })` read that client's data.
They address the same URLs as the Personal client but are different operations:
the data belongs to another person, and authentication is a Corporate signature
rather than a Personal token. Response shapes are shared, so `ClientInfo` and
`StatementItem` are the same types the Personal client returns.

### monoКЕП document signing

`corporate.documents.requestSigning()` submits one to ten documents and returns a
`deeplink` the signatory opens in the Monobank app, plus a `requestId` for
`getSigningStatus()` and `cancelSigning()`. A request is valid for three days.

Document hashes use **ГОСТ 34.311-95**, which neither Web Crypto nor
`node:crypto` implements. The SDK never computes or verifies the hash — you
supply the hex string. A SHA-256 hash is the same length and will produce a
well-formed request that is silently wrong.

`keyId` is optional only for the registration flow, which is what issues it:
`register()` and `getRegistrationStatus()` sign with `X-Time` and the URL alone
and send no `X-Key-Id`. Every other operation fails validation before Fetch when
the client has no key. `setWebhook()` triggers a test POST from Monobank to the
URL during the call, so it can fail for reasons outside the request itself.

This surface is verified against synthetic fixtures only. Exercising it live
requires Monobank to approve the company as a provider, which is why the
response schema treats every undocumented field conservatively.

### Покупка Частинами

Buy-now-pay-later runs on its own origin with its own credential. Requests carry
a `store-id` header and a `signature` header holding
`Base64(HMAC-SHA256(request_body, store_secret))`, which the SDK computes with
built-in Web Crypto — no injected signer, unlike the Corporate family:

```ts
import { MonobankInstallmentsClient } from "@liaugust/monobank-sdk";

const installments = new MonobankInstallmentsClient({
  storeId: "your_store_id",
  storeSecret: process.env.MONOBANK_STORE_SECRET!,
});

const { found } = await installments.clients.validateV2({
  phone: "+380501234567",
});
```

Four things differ from every other family in this package, all of them upstream
and all preserved rather than papered over:

|             | Покупка Частинами            | Elsewhere                 |
| ----------- | ---------------------------- | ------------------------- |
| Origin      | `https://u2.monobank.com.ua` | `https://api.monobank.ua` |
| Credential  | `store-id` + body HMAC       | `X-Token` or `X-Sign`     |
| Field names | `snake_case`                 | `camelCase`               |
| Sums        | hryvnia, e.g. `2499.99`      | integer minor units       |

Monobank documents a sandbox at `https://u2-demo-ext.mono.st4g3.com` and a stage
environment at `https://u2-ext.mono.st4g3.com`; pass either as `baseUrl`.

Prefer `validateV2()` over `validate()`. Both answer whether a phone number
belongs to a Monobank client, but `validate()` also returns the person's name and
tax identifier, which most callers do not need and should not store.

#### Orders

The order lifecycle is a state machine, and one state matters more than the rest:

```ts
const order = await installments.orders.create({
  available_programs: [
    { available_parts_count: [3, 6, 10], type: "payment_installments" },
  ],
  client_phone: "+380501234567",
  invoice: { date: "2024-01-15", number: "INV-1", source: "INTERNET" },
  products: [{ count: 1, name: "TV", sum: 2_499.99 }],
  result_callback: "https://shop.example.com/api/order/callback",
  store_order_id: "ORD-1",
  total_sum: 2_499.99,
});

const state = await installments.orders.getState({ order_id: order.order_id });

if (state.order_sub_state === "WAITING_FOR_STORE_CONFIRM") {
  // The client approved the credit. Release the goods, then activate the plan:
  await installments.orders.confirm({ order_id: order.order_id });
}
```

`WAITING_FOR_STORE_CONFIRM` means the client approved the credit, so the goods can
be released. **The plan is not active until `confirm()` lands** — call `reject()`
instead if the order cannot be fulfilled.

Sums here are **hryvnia, not minor units**: `total_sum: 2_499.99` is sent as
written. Multiplying by 100 the way the Acquiring family requires would ask the
client for a hundred times the price.

`getData()` and `getInfo()` both read settlement details, and Monobank documents
them with identical shapes, so both are exposed rather than one being assumed an
alias. Returns go through `returnGoods()`, and `checkPaid()` reports whether the
bank can refund to the card at all before you ask it to:

```ts
const payment = await installments.orders.checkPaid({
  order_id: order.order_id,
});

await installments.orders.returnGoods({
  order_id: order.order_id,
  return_money_to_card: payment.bank_can_return_money_to_card === true,
  store_return_id: "RET-1",
  sum: 1_250.5,
});
```

Nested request objects — `invoice`, `additional_params`,
`financial_company_merchant_info`, and each product — are **forwarded whole**.
Monobank documents their fields only through samples, so an undocumented key you
send reaches the API rather than being silently dropped.

#### Guarantee letters and reporting

`letters.getData()` and `letters.getDataV2()` return the source data behind a
guarantee letter, and `letters.download()` returns the letter itself:

```ts
const data = await installments.letters.getData({ order_id: orderId });

const letter = await installments.letters.download({ order_id: orderId });
await writeFile("guarantee-letter.pdf", letter.bytes);
```

> [!IMPORTANT]
> The letter payload is the most sensitive data this SDK carries: a full name, a
> tax identifier, and up to four government identity documents — passport, ID
> card, residence permit, and international passport. Read only what the letter
> requires, keep it out of logs, and hold it under your own retention rules.

`download()` is the one method whose success is **not** JSON. It returns raw
`bytes` and the `contentType` Monobank declared, rather than a validated object —
nothing decodes the body. An empty success is rejected as a broken response
instead of being handed over as an empty file. The request asks for
`application/pdf`, but check `contentType` before assuming that is what arrived.

Daily settlement comes from `reports.getStoreReport()`:

```ts
const report = await installments.reports.getStoreReport({
  date: "2024-01-15",
});

for (const order of report.orders) {
  console.log(order.total_sum, order.transferred_sum, order.commission);
}
```

`date` is a plain `YYYY-MM-DD` day. Sums are hryvnia, and `operation_timestamp`
is `null` until the transfer is made, so an order can appear in the report before
its money moves.

#### Verifying callbacks

Monobank signs callbacks with the same scheme it requires on requests, so verify
before acting — and verify the **raw bytes**, because `JSON.parse` followed by
`JSON.stringify` can reorder keys and change what was signed:

```ts
import {
  parseInstallmentsCallbackEvent,
  verifyInstallmentsCallbackSignature,
} from "@liaugust/monobank-sdk";

const raw = await request.arrayBuffer();
const authentic = await verifyInstallmentsCallbackSignature({
  body: raw,
  signature: request.headers.get("signature") ?? "",
  storeSecret: process.env.MONOBANK_STORE_SECRET!,
});

if (!authentic) {
  return new Response(null, { status: 401 });
}

const event = parseInstallmentsCallbackEvent(
  JSON.parse(new TextDecoder().decode(raw)),
);
```

Callbacks arrive only for terminal outcomes. Intermediate states such as
`IN_PROCESS/WAITING_FOR_CLIENT` are never delivered, so poll for those.

## Retries, timeouts, and cancellation

Only safe GET requests are ever retried; mutating methods are excluded
structurally rather than by configuration. Timeouts are never retried either — a
configured `timeoutMs` is your ceiling for one attempt, so exceeding it fails the
request rather than spending the budget again.

By default the retryable statuses are `defaultRetryableStatusCodes`
(`429, 500, 502, 503, 504`). Narrow them when a retry cannot help:

```ts
const personal = new MonobankPersonalClient({
  retry: {
    baseDelayMs: 1_000,
    maxAttempts: 3,
    maxDelayMs: 8_000,
    retryableStatusCodes: [500, 502, 503, 504],
  },
  token,
});
```

Monobank documents `/personal/client-info` and `/personal/statement` at **one
request per 60 seconds**, so a `429` there means the minute's quota is already
spent — a one-second backoff cannot succeed and only spends more of it. If your
application already paces itself, excluding `429` is the right trade.

Retries are disabled unless configured. A retry policy applies only to safe
GET requests and respects `Retry-After`. Mutating methods are never retried,
including `personal.webhooks.set()`, every `acquiring.invoices` mutation, and
`acquiring.qr.resetAmount()`.

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

A cleartext `http:` base URL is rejected at construction whenever a token is
configured, unless it targets a loopback host, so a credential is never sent
over an unencrypted connection.

The SDK sets `redirect: "error"` on every request, so it never follows HTTP
redirects when using the runtime's built-in Fetch. Fetch keeps custom headers
such as `X-Token` across a cross-origin redirect and replays the body on
`307`/`308`, so a redirected request fails with `MonobankNetworkError` instead
of sending credentials or repeating a mutation somewhere the SDK never
validated. A custom `fetch` must honor `RequestInit.redirect`; an
implementation that ignores it reintroduces cross-origin token replay.

A blocked redirect is reported as `reason: "network"`, indistinguishable from a
transient failure, so a retry-eligible safe GET consumes its configured
attempts before failing. Mutating requests are never retried.

## Runtime schemas

The package exports its Zod Mini schemas for applications that need the exact
same validation boundary:

```ts
import {
  acquiringQrCashierListSchema,
  acquiringQrDetailsSchema,
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
