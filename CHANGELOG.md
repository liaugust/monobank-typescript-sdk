# Changelog

All notable changes to this package are documented here.

## Unreleased

- Add authenticated Acquiring statements with validated time windows,
  submerchant filtering, retry and cancellation support, response schemas, and
  importable transaction status and payment-scheme values.
- Add authenticated Acquiring submerchant discovery with validated terminal
  ownership data, safe retries, cancellation, schemas, and public types.
- Add Acquiring QR cashier listing, details, and amount reset with validated
  identifiers, cancellation, schemas, public types, and importable amount-type
  values. Listing and details are safe GETs eligible for configured retries;
  `acquiring.qr.resetAmount()` mutates merchant state and is never retried.

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
