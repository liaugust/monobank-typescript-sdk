# Changelog

All notable changes to this package are documented here.

## Unreleased

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
