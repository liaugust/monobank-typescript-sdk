# Changelog

All notable changes to this package are documented here.

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
