# Changelog

All notable changes to this package are documented here.

## Unreleased

### Added

- `MonobankInstallmentsClient` for Покупка Частинами, the fifth credential family.
  It authenticates with a `store-id` header and a `signature` header holding
  `Base64(HMAC-SHA256(request_body, store_secret))`, which the SDK computes with
  built-in Web Crypto rather than an injected signer: unlike the Corporate
  secp256k1 keys, this scheme is one Web Crypto supports. The client defaults to
  `https://u2.monobank.com.ua`, not `api.monobank.ua`, and Monobank's sandbox and
  stage origins can be passed as `baseUrl`.
- `installments.clients.validate(input)` and
  `installments.clients.validateV2(input)` for client eligibility. `validateV2`
  answers with `found` alone; `validate` also returns the person's name and tax
  identifier, so the docs recommend the former. Exports
  `InstallmentsClientValidation`, `InstallmentsClientPresence`,
  `ValidateInstallmentsClientInput`, and the matching schemas.
- `verifyInstallmentsCallbackSignature(input)` authenticating a callback over its
  exact raw bytes with a constant-time comparison, and
  `parseInstallmentsCallbackEvent(payload)` for shape validation. Monobank sends
  callbacks only for terminal outcomes, which is stated where both are documented.
- The transport gained a third credential mode. `token`, `corporate`, and
  `installments` remain mutually exclusive, and an authenticated request now signs
  the exact serialized body it sends rather than a re-serialization of the input.
- `acquiring.monopay` for the monopay button's signing keys: `listKeys()`,
  `importKey(input)`, and `deleteKey(input)`. Entries arrive under `result`
  rather than `list`, as Monobank documents. `importKey` takes the Base64 public
  half only; deleting a key invalidates every widget signature made with it.
  Exports `MonopaySigningKey`, `MonopaySigningKeyList`,
  `ImportedMonopaySigningKey`, their schemas, and the input types.
- `acquiring.t2p` for tap-to-phone: `listTerminals()` and
  `getPaymentStatus(input)`. Monobank keeps these payments for 90 days and
  answers 404 afterwards. Three response fields diverge from the rest of the API
  and are preserved as documented rather than normalized: `ccy` is alphabetic
  such as `UAH`, `dataTime` is space-separated rather than RFC-3339, and
  `errorMessage` is explicitly `null` on success. Exports `AcquiringT2pPayment`,
  `AcquiringT2pTerminal`, `AcquiringT2pTerminalList`, and their schemas.
- `acquiring.split.listReceivers()` for split-payment receivers. A returned
  `splitReceiverId` is what `merchantPaymInfo.basketOrder[].splitReceiverId`
  expects on `acquiring.invoices.create()`. Exports `AcquiringSplitReceiver`,
  `AcquiringSplitReceiverList`, and their schemas.
- `acquiring.pos.cancelTransaction(input)` refunding a POS transaction by `rrn`.
  A successful response acknowledges that the refund was initiated rather than
  settled, and the request is never retried because retrying could refund twice.
  Exports `AcquiringPosCancellation` and its schema.
- `Rfc3339TimeInput` for the timestamp inputs Monobank documents as RFC-3339,
  now shared by the subscription windows and the monopay key expiry.
- `acquiring.subscriptions` covering the six documented recurring-payment
  endpoints: `create(input)`, `getStatus(input)`, `list(input)`,
  `getPayments(input)`, `edit(input)`, and `remove(input)`. `create` returns the
  `subscriptionId` and the `pageUrl` where the payer authorizes the first
  payment; Monobank then charges the saved card on the `interval` cadence.
  `edit` cancels and can refund in the same request, while `remove` only
  deactivates. Exports `AcquiringSubscription`, `AcquiringSubscriptionList`,
  `AcquiringSubscriptionListItem`, `AcquiringSubscriptionPayment`,
  `AcquiringSubscriptionPaymentList`, `AcquiringSubscriptionPagination`,
  `AcquiringSubscriptionSummary`, `AcquiringSubscriptionWalletData`,
  `NewAcquiringSubscription`, `AcquiringSubscriptionAction`,
  `AcquiringSubscriptionStatus`, the matching schemas, and the input types.
- Subscription windows accept a `Date` or an RFC-3339 string, unlike
  `acquiring.statements.get()`, which takes Unix seconds. `dateFrom` is required
  by Monobank, and a reversed window is rejected before Fetch because Monobank
  answers one with an empty result rather than an error.
- `interval` is validated as `{count}{d|w|m|y}` before Fetch, so a plausible
  value such as `"1h"` fails locally instead of upstream.

### Fixed

- `acquiring.invoices.create()` no longer discards documented request fields.
  `successUrl`, `failUrl`, `displayType`, and `withAppUrl` were absent from the
  request schema, and because request schemas are built with `z.object`, which
  strips unknown keys, a caller who set one got no error and no effect. The same
  silent drop applied to `merchantPaymInfo.metadata` and
  `merchantPaymInfo.basketOrder[].splitReceiverId`, both found while auditing the
  endpoint. All six are now accepted, validated, and sent, and `NewInvoice`
  carries the documented `appUrl` deeplink returned when `withAppUrl` is sent.
- `InvoicePaymentType` gained the documented `Verification` value, and a
  verification invoice is rejected before Fetch unless `amount` is `0` and
  `saveCardData.saveCard` is `true`, which Monobank documents as mandatory for
  it. Exports `InvoiceDisplayType` for the `displayType` values.
- Corrected the coverage claim. `0.4.0` announced "every operation Monobank
  documents: 37 of 37"; both numbers were wrong. Coverage was measured against
  the Redoc specs at `api.monobank.ua/docs/` alone, while the newer
  <https://monobank.ua/api-docs> documents 27 further operations, and the
  implemented total is 36 rather than 37. Actual coverage is 36 of the 63
  operations the two sites document together. `README.md`, `llms.txt`, and
  `AGENTS.md` now state the counts and link the gap tracker.

## 0.4.0 - 2026-08-19

The Corporate provider API is now covered, completing every operation Monobank
documents: 37 of 37 across the Public, Personal, Acquiring, and Corporate
families.

Corporate requests are authenticated by ECDSA request signing rather than a
token. Service keys are secp256k1, which Web Crypto cannot sign with, so
`MonobankCorporateClient` takes an injected signing function and the private key
never enters the SDK.

### Added

- `MonobankCorporateClient` for the Corporate provider API, which authenticates
  by request signing rather than `X-Token`, sending `X-Key-Id`, `X-Time`,
  `X-Sign`, and where documented `X-Request-Id`. Service keys are secp256k1,
  which Web Crypto cannot sign with, so the client takes an injected `sign`
  function and never holds the private key.
- `corporate.company.getSettings(input)` reading the signed
  `GET /personal/corp/settings` endpoint, plus `corporateSettingsSchema`,
  `CorporateSettings`, `GetCorporateSettingsInput`, `CorporateSigner`, and
  `CorporateSignatureInput`.
- `corporate.company.register(input)` and
  `corporate.company.getRegistrationStatus(input)` for the company
  authorization flow. Both run before Monobank has issued a key, so they sign
  with `X-Time` and the URL alone and send no `X-Key-Id`;
  `MonobankCorporateClientOptions.keyId` is therefore optional, and every
  non-registration operation rejects a keyless client before Fetch. Exports
  `CorporateRegistrationStatus`, `corporateRegistrationSchema`,
  `corporateRegistrationStatusSchema`, and the matching input and result types.
  `CorporateRegistrationStatusResult.keyId` is optional and `status` is a plain
  string, both looser than the specification's `required` array: no key exists
  while an application is `New`, and Monobank declares no `enum` for `status`,
  so requiring either would let a pending response break the only flow that
  issues a key. Compare against `CorporateRegistrationStatus`.
- `corporate.access.request(input?)` and `corporate.access.check(input)` for the
  delegated client-access grant flow. `check()` is the first operation to sign
  the `X-Time | X-Request-Id | URL` payload variant, resolves `void` because
  Monobank answers with an empty body, and reports a pending grant as
  `MonobankApiError` status 401. Exports `corporateTokenRequestSchema`,
  `CorporateTokenRequest`, `RequestCorporateAccessInput`, and
  `CheckCorporateAccessInput`.
- `corporate.clients.getInfo(input)` and `corporate.clients.getStatements(input)`
  reading a granted client's identity and statements under Corporate signing.
  Both reuse `clientInfoSchema` and `statementItemsSchema`, because the wire
  contracts match the Personal endpoints and only the credential and the data's
  owner differ. Exports `GetCorporateClientInfoInput`,
  `GetCorporateClientStatementsInput`, and `StatementWindowInput`.
- monoКЕП document signing through `corporate.documents.requestSigning(input)`,
  `corporate.documents.getSigningStatus(input)`, and
  `corporate.documents.cancelSigning(input)`. Document hashes use ГОСТ 34.311-95,
  which no JavaScript runtime implements, so the caller computes the hex value and
  the SDK never verifies it. Exports `DocumentSigningState`,
  `SigningDocumentType`, `documentSignatorySchema`, `signingDocumentSchema`,
  `documentSigningRequestSchema`, `documentSigningStatusSchema`, and the matching
  input and result types.
- `corporate.company.setWebhook(input)` configuring the payment-update webhook
  over the signed `POST /personal/corp/webhook` endpoint, reusing the Personal
  webhook URL validation. Monobank test-POSTs the URL during the call.
- `retry.retryableStatusCodes` selecting which response statuses are eligible for
  retry, with the previous set exported as `defaultRetryableStatusCodes`
  (`429, 500, 502, 503, 504`). `429` was previously unavoidable, so a consumer who
  wanted `5xx` retries had to accept it: on `/personal/client-info` and
  `/personal/statement`, documented at one request per 60 seconds, a retried `429`
  cannot succeed and spends more quota. The default set is unchanged, so existing
  behavior is preserved.

### Fixed

- Bound the Corporate signer with the per-attempt timeout. The attempt signal was
  only ever given to Fetch, so a signing call that never settled blocked the
  request indefinitely despite a configured `timeoutMs`. Signing now races the
  attempt and fails with `MonobankNetworkError` and `reason: "timeout"`, or
  `"aborted"` when the caller cancels, matching how a hanging request behaves. A
  signer that throws still fails as a non-retryable `MonobankValidationError` with
  no cause attached.

### Security

- Drop echoed `X-Sign` and `X-Key-Id` response headers from `MonobankApiError`,
  and redact a configured Corporate `keyId` from an upstream error message the
  same way the token already was. A proxy or gateway that echoes a submitted
  credential header could otherwise place it on a public, serializable error.
- Reject a `webHookUrl` that does not survive URL parsing unchanged. `new URL()`
  silently strips tabs and line breaks, so a value could be validated as one
  address and sent as another.
- Reject a token containing a control character at construction. It previously
  passed the surrounding-whitespace check, reached `Headers.set`, and threw a bare
  `TypeError` the transport misread as a retryable network failure.

### Changed

- Raise the supported runtime floor from Node.js 20.19.5 to 22.12.0. Node 20
  reached end of life on 2026-04-30 and no longer receives security patches, so
  it is no longer declared or verified. `22.12.0` is the Node 22 release that
  enabled `require(esm)`, matching why the previous floor was `20.19.5`. The
  built output uses nothing newer than ES2022 and still runs on Node 20, but
  installing under pnpm now fails the `engines` check there, and the CI matrix
  verifies Node 22 and 24 only.

## 0.3.0 - 2026-08-18

### Fixed

- Accept `/personal/client-info` responses that omit `jars`, `permissions`, or
  `webHookUrl`. Neither Monobank specification marks any field on this response
  required, and the corporate specification's own sample omits `jars` entirely,
  so `personal.client.getInfo()` previously failed with
  `MonobankResponseValidationError` on valid payloads. `clientId`, `name`, and
  `accounts` remain required.
- Widen the `zod` dependency from the exact version `4.4.3` to `^4.4.3`. An
  exact runtime dependency cannot be deduplicated, so a consumer already on
  another `4.x` installed and bundled a second copy of zod.

### Changed

- `ClientInfo.jars` is now `readonly Jar[] | undefined`. Code that reads
  `info.jars` without a guard will need one. This is the reason the change ships
  as a minor rather than a patch: the previous type promised a field Monobank
  omits, and `^0.2.x` would have delivered the corrected type without an
  explicit upgrade.

## 0.2.1 - 2026-08-18

Documentation only. Records two upstream behaviors found by probing a live
Monobank sandbox merchant, both of which a caller meets on an ordinary first
integration.

### Fixed

- Document that a QR cashier returned by `acquiring.qr.list()` can still fail
  `acquiring.qr.getDetails()` with status 404, because Monobank answers only for
  activated cashiers. State explicitly that `getDetails()` takes the cashier's
  `qrId` and not its `shortQrId`, which the upstream specification leaves
  ambiguous, and that a successful response may carry `shortQrId` alone.
- Document that `acquiring.invoices.getReceipt()` fails with status 400 for an
  unpaid invoice, reusing the same generic invalid-parameter status Monobank
  returns for a malformed request, so the status alone does not distinguish the
  two.

## 0.2.0 - 2026-08-17

The Acquiring API surface is now complete: every endpoint Monobank documents is
implemented, alongside the already-complete Public and Personal surfaces.

### Added

- Add authenticated Acquiring statements with validated time windows,
  submerchant filtering, retry and cancellation support, response schemas, and
  importable transaction status and payment-scheme values.
- Add authenticated Acquiring submerchant discovery with validated terminal
  ownership data, safe retries, cancellation, schemas, and public types.
- Add Acquiring QR cashier listing, details, and amount reset with validated
  identifiers, cancellation, schemas, public types, and importable amount-type
  values. Listing and details are safe GETs eligible for configured retries;
  `acquiring.qr.resetAmount()` mutates merchant state and is never retried.
- Add Acquiring employee listing for merchants that route tips.
- Add the Acquiring wallet resource: list tokenized cards, charge a stored card
  token, and remove a token over HTTP DELETE. The two mutations are never
  retried.
- Add `acquiring.invoices.payDirect()` and `acquiring.invoices.syncPayment()`.
  Both accept cardholder or crypto-container material and therefore place the
  calling system in PCI DSS scope; both are documented accordingly and are
  never retried.
- Support HTTP DELETE in the transport, excluded from retries like every other
  mutating method.

### Security

- Stop following HTTP redirects so a redirected request can never replay the
  `X-Token` header or a mutating request body to an unvalidated origin.
- Reject a cleartext `http:` base URL when a token is configured, unless it
  targets a loopback host, so a credential cannot be sent over the wire in the
  clear.

## 0.1.0 - 2026-08-16

- Organize Public, Personal, and Acquiring APIs into focused resource clients.
- Add the Acquiring merchant and complete invoice-lifecycle API surface.
- Authenticate Acquiring webhooks with a fetched public key and built-in Web
  Crypto signature verification for Node.js and browser consumers.
- Preserve strict runtime validation, credential-safe errors, bounded retries,
  cancellation, and complete ESM, CommonJS, declaration, browser, and packed
  package verification.
- Publish the first GitHub-driven release through npm trusted publishing with
  provenance.

## 0.0.1 - 2026-08-16

- Add runtime-validated Public and Personal Monobank API clients.
- Add strict error, retry, cancellation, statement, and webhook contracts.
- Support Node.js ESM, Node.js CommonJS, and modern browser bundlers.
- Export documented account and cashback wire values for consumers.
