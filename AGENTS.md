# Agent Guide: @liaugust/monobank-sdk

This file is the operating contract for coding agents that use or modify this
package. Prefer repository code and tests over memory, and prefer official
Monobank documentation over inferred API behavior.

## Package Mission

Provide a strict TypeScript boundary around Monobank APIs without leaking
credentials or trusting upstream JSON. The package is unofficial and must not
claim endorsement by Monobank or completeness of the API surface.

## Documentation Sources

Monobank publishes two sites and neither is a superset of the other. Consult
both before concluding that an endpoint exists or does not:

- <https://monobank.ua/api-docs> — current, and the only source for Acquiring
  recurring payments, monopay keys, T2P terminals, split receivers, POS refunds,
  and Покупка Частинами. Its section indexes list paths without fields, so open each
  endpoint page; reading an index alone is how four `invoice/create` fields were
  missed.
- <https://api.monobank.ua/docs/> — older Redoc specs (`index`, `acquiring`,
  `corporate`), and the only source for 17 operations: all of Personal and
  Corporate, plus `/bank/sync`, `/api/merchant/employee/list`, and
  `/api/merchant/invoice/sync-payment`.

49 of the 63 documented operations are implemented. The 14 that remain are all
of Покупка Частинами, tracked under issue #59.

## Rules for Consumer Code

- Import public values and types only from `@liaugust/monobank-sdk`.
- Construct `MonobankPublicClient` without a token for `/bank/*` calls.
- Construct `MonobankPersonalClient` with a validated Personal token.
- Construct `MonobankAcquiringClient` with a separate validated Acquiring token.
- Reuse `clientInfoSchema` and `statementItemsSchema` for the delegated
  Corporate reads. They are the same wire contracts as the Personal endpoints;
  only the credential and the data's owner differ, so never fork the schemas.
- Never compute or verify a monoКЕП document hash. It uses ГОСТ 34.311-95, which
  no JavaScript runtime implements and which cannot be added without breaking the
  single-runtime-dependency rule, so the caller supplies the hex value and the
  SDK only carries it. Say so wherever the field is documented: a SHA-256 hash is
  the same length and fails silently.
- Treat `corporate.access.*` and the delegated reads as third-party data access.
  A client grants it, it covers only the registered permissions, and the client
  can revoke it. Never widen what a grant is used for beyond the caller's stated
  purpose.
- Construct `MonobankCorporateClient` with a service `keyId` and a `sign`
  function. It takes no token. Omit `keyId` only for the registration flow,
  which is what issues it. Never place a private key inside the SDK or in
  application logs; the signer is the only thing that touches it.
- Construct `MonobankInstallmentsClient` with a `storeId` and `storeSecret`. The
  secret is a symmetric HMAC key the SDK signs request bodies with, so it never
  leaves the process on the wire; treat it like a token and keep it out of logs
  and source. This family lives on `https://u2.monobank.com.ua`, not
  `api.monobank.ua`.
- Prefer `installments.clients.validateV2()` over `validate()`. Both answer
  whether a phone number belongs to a client, but `validate()` also returns a
  name and tax identifier that most callers neither need nor should store.
- Authenticate a Покупка Частинами callback with
  `verifyInstallmentsCallbackSignature()` over the exact raw request bytes before
  parsing it. Re-serializing the parsed body can reorder keys and invalidate the
  signature. `parseInstallmentsCallbackEvent()` is shape validation only.
- Release Покупка Частинами goods only on `WAITING_FOR_STORE_CONFIRM`, then call
  `orders.confirm()` to activate the plan, or `orders.reject()` when the order
  cannot be fulfilled. The plan is not active until one of those lands.
- Send Покупка Частинами sums as hryvnia. `total_sum: 2499.99` is correct;
  multiplying by 100 as the Acquiring family requires would charge a hundred times
  the price.
- Read `orders.checkPaid().bank_can_return_money_to_card` before setting
  `return_money_to_card: true` on `orders.returnGoods()`. Never retry a return: it
  moves money, and `store_return_id` is the store's idempotency handle, not the
  SDK's.
- Do not expect a Покупка Частинами callback for an intermediate state. Monobank
  sends one only for terminal outcomes, so poll `orders.getState()` for the rest.
- Never hardcode, log, serialize, or commit real tokens or API payloads.
- Treat all monetary integers as minor currency units, except in Покупка
  Частинами, where sums are hryvnia with decimals such as `2499.99`. Its wire
  fields are also snake_case. Preserve both rather than normalizing.
- Treat rate and Personal statement timestamps as Unix seconds. Acquiring
  statement request inputs use Unix seconds and response dates use RFC-3339;
  `serverTimeMsec` is Unix milliseconds.
- Use `AccountType` and `CashbackType` instead of repeating their wire strings.
- Use the exported statement, invoice, payment, cancellation, discount, wallet,
  and fiscal enum-like values instead of repeating their wire strings.
- Pass an `AbortSignal` when a caller needs cancellation.
- Configure retries only when the application accepts repeated safe GET calls.
  Mutating Personal and Acquiring methods are never retried by the SDK, and no
  timeout is ever retried.
- Narrow `retry.retryableStatusCodes` to `[500, 502, 503, 504]` for a Personal
  client. Both documented Personal endpoints allow one request per 60 seconds, so
  retrying a `429` cannot succeed and spends more of the quota.
- Narrow caught errors with the exported SDK error classes. Do not assume every
  failure is an HTTP error.
- Treat `parsePersonalWebhookEvent()` as shape validation only. Authenticate
  webhook delivery separately before acting on it.
- Authenticate Acquiring webhooks with `verifyAcquiringWebhookSignature()`
  over the exact raw request bytes before parsing or transforming the body.
- Cache the result of `acquiring.webhooks.getPublicKey()` in application
  infrastructure and refresh it only after verification with the cached key
  fails; the SDK intentionally does not own cache policy.
- Call only methods listed in `docs/API.md`, and never invent one. Absence from
  that file says nothing about upstream: 14 documented operations are still
  unimplemented, so check `Documentation Sources` before telling a caller that
  Monobank has no such endpoint.
- Treat a Corporate `sign` result as credential material; the SDK sends it as
  `X-Sign` and never logs it. Return base64 of the raw 64-byte `r || s` pair, not
  DER. Monobank documents neither the digest nor whether the signed `URL` includes
  the query, so both are unverified assumptions.
- Pass an Acquiring subscription `interval` as `{count}{d|w|m|y}`; anything else
  is rejected before Fetch. A `validity` above 30 days is not an error and is not
  honored either, because Monobank truncates it silently.
- Treat `AcquiringSubscription.walletData.cardToken` as credential material. It
  authorizes further charges, so never log, serialize, or persist it outside
  secured merchant storage.
- Read only `subscriptionId` and `status` from a subscription without narrowing.
  Monobank documents the subscription responses with samples rather than
  schemas, so every other field is optional by decision, including `pagination`
  on a page. Do not tighten one because a sample happens to show it.
- Use RFC-3339 for subscription `dateFrom` and `dateTo`, not the Unix seconds
  `acquiring.statements.get()` takes. `dateFrom` is required upstream, and a
  reversed window is rejected before Fetch because Monobank would answer it with
  an empty result rather than an error.
- Never send a monopay private key anywhere. `acquiring.monopay.importKey()`
  takes the Base64 public half only, and deleting a key invalidates every widget
  signature made with it.
- Read `acquiring.t2p.getPaymentStatus()` fields as documented rather than as the
  rest of the API spells them: `ccy` is alphabetic such as `UAH`, `dataTime` is
  space-separated rather than RFC-3339, `errorMessage` is explicitly `null` on
  success, and `maskedPan` holds the card number while `cardMask` holds the
  scheme. Do not normalize any of them.
- Treat `acquiring.split.listReceivers()` results as counterparty data. Each
  entry's `edrpou` identifies a real business.
- Never retry `acquiring.pos.cancelTransaction()`. It moves money, and its success
  response means the refund was initiated rather than settled.
- Treat `acquiring.invoices.payDirect()` and `acquiring.invoices.syncPayment()`
  as PCI DSS surfaces. Never log, serialize, persist, or echo raw card details
  or crypto-container values, and prefer a hosted invoice or a stored card
  token when suggesting an integration.

## Minimal Correct Usage

```ts
import { MonobankPersonalClient } from "@liaugust/monobank-sdk";

async function loadStatements(token: string, signal: AbortSignal) {
  const client = new MonobankPersonalClient({
    retry: {
      baseDelayMs: 250,
      maxAttempts: 3,
      maxDelayMs: 2_000,
    },
    token,
  });

  const info = await client.client.getInfo({ signal });
  const account = info.accounts[0];

  if (account === undefined) {
    return [];
  }

  return await client.statements.get(
    {
      account: account.id,
      from: new Date("2026-08-01T00:00:00.000Z"),
    },
    { signal },
  );
}
```

## Public Surface

The root entry point exports:

- `MonobankPersonalClient`
- `MonobankPublicClient`
- `MonobankAcquiringClient`
- `MonobankCorporateClient`
- seventeen resource properties exposed through the four parent clients: `bank`,
  `currency`, `client`, Personal `statements`, Personal `webhooks`, `merchant`,
  `employees`, `invoices`, Acquiring `statements`, `submerchants`, `qr`,
  `wallet`, Acquiring `webhooks`, and Corporate `access`, `clients`, `company`,
  and `documents`
- enum-like const values, including `AccountType`, `CashbackType`,
  `AcquiringPaymentScheme`, `AcquiringQrAmountType`, `AcquiringStatementStatus`,
  `InvoicePaymentType`, `InvoiceStatus`, `CorporateRegistrationStatus`,
  `DocumentSigningState`, and `SigningDocumentType`
- response schemas for accounts, bank sync, client info, currency rates, jars,
  managed clients, merchant details, submerchants, QR cashiers, QR cashier
  details, invoices, receipts, fiscal checks, statements, Personal webhook
  events, corporate settings, corporate registration and its status, delegated
  access requests, and monoКЕП documents, signatories, and signing status
- `defaultRetryableStatusCodes`
- `parsePersonalWebhookEvent`
- `verifyAcquiringWebhookSignature`
- Personal, Acquiring, and Corporate request, response, transport, retry, and
  error types, including `CorporateSigner` and `CorporateSignatureInput`
- `MonobankApiError`, `MonobankNetworkError`,
  `MonobankResponseValidationError`, and `MonobankValidationError`

Read `docs/API.md` for the complete consumer reference and `src/index.ts` for
the authoritative export list. Read the generated declarations or source JSDoc
before generating calls; do not guess arguments.

## Repository Map

```text
src/index.ts                    public package boundary
src/acquiring/client/           Acquiring parent client and options
src/acquiring/merchant/         merchant resource and endpoint slice
src/acquiring/employees/        employee resource and endpoint slice
src/acquiring/invoices/         invoice endpoints, models, and request helpers
src/acquiring/qr/               QR cashier resource, endpoints, and models
src/acquiring/statements/       statement resource, endpoint, and models
src/acquiring/submerchants/     submerchant resource, endpoint, and models
src/acquiring/shared/           shared Acquiring response models
src/acquiring/wallet/           tokenized card resource, endpoints, and models
src/acquiring/webhooks/         trust-key endpoint and signature verification
src/corporate/access/           delegated client-access resource and endpoints
src/corporate/client/           Corporate parent client and options
src/corporate/clients/          delegated reads of a granted client's data
src/corporate/documents/        monoKEP document signing resource and endpoints
src/corporate/company/          company resource, endpoint, and response model
src/public/client/              token-free Public parent client and options
src/public/bank/                bank resource and sync endpoint
src/public/currency/            currency resource and rates endpoint
src/personal/client/            Personal parent client and options
src/personal/client-info/       identity resource, endpoint, and models
src/personal/statements/        statements resource, endpoint, and models
src/personal/webhooks/          webhook resource, input, and event parser
src/transport/request/          request security and attempt-signal ownership
src/transport/retry/            retry policy, delay, and Retry-After parsing
src/transport/response/         successful and failed response normalization
src/shared/                     request options, validation, URL, webhook body, statement path, unix time
src/errors/                     public credential-safe error classes
tests/fixtures/{public,personal,acquiring}/ synthetic contract fixtures
tests/types/                    compile-time public API assertions
tests/consumers/                ESM, CJS, browser, declaration, and tarball checks
.github/workflows/ci.yml        Node 22/24 verification matrix
.github/workflows/release.yml   npm trusted-publishing workflow
```

## Architectural Invariants

- Preserve the separation between Public, Personal, Acquiring, and Corporate
  clients. A single transport must never hold both a token and a Corporate
  credential; configuring both is rejected.
- Sign Corporate requests once per attempt, never once per request. `X-Time` is
  signed, so a retry after a backoff delay would replay a stale timestamp.
  The attempt signal is passed into signing, so `timeoutMs` bounds a signer that
  never settles and it fails as a timeout like any other.
- Send only printable ASCII without spaces in `X-Key-Id`, `X-Request-Id`, and
  `X-Sign`. `Headers.set` throws a bare `TypeError` on a control character, which
  the transport would misread as a retryable network failure.
- Sign the two registration endpoints without `X-Key-Id`; they run before a
  key exists. Every other Corporate operation requires the configured key and
  fails validation ahead of Fetch without one.
- State each Corporate operation's signed-payload variant explicitly. Monobank
  documents two, and they do not follow from which headers a request sends:
  `/personal/corp/settings` and `/personal/corp/webhook` send `X-Request-Id`
  while signing the variant that excludes it.
- Never attach a Corporate signer's own failure as an error cause; a crypto
  library's message can echo key material.
- Send Personal `X-Token` only to `/personal/*` and Acquiring `X-Token` only to
  `/api/merchant/*`. Public `/bank/*` requests must never receive either token.
- Reject a cleartext `http:` base URL whenever any credential is configured,
  token or Corporate signer. Only
  `localhost`, `127.0.0.0/8`, and `::1` stay allowed, so local proxies and
  contract tests keep working while the token never travels in the clear. Do
  not widen this to `*.localhost`: browsers resolve that to loopback in the
  network stack, but Node defers to the OS resolver.
- Keep every API family grouped by resource and each endpoint in its own named
  folder with colocated tests. Put response models under the owning resource's
  `models` folder and request-only helpers under `shared` when reused.
- Parse every successful JSON response through its matching Zod Mini schema.
- Use loose response objects so validated additive upstream fields survive.
- Model the `list` wrapper as required across Acquiring list endpoints even
  where Monobank's OpenAPI `required` array omits it, matching the statement,
  submerchant, and QR schemas. Revisit all three together if an account with no
  records is observed to return a bare `{}`.
- Model the Corporate registration status response looser than its `required`
  array: `keyId` is optional because no key exists while an application is
  `New`, and `status` is a plain string because the specification declares no
  `enum` and lists the three values only in prose. Requiring either would let a
  pending response break the one flow that issues the key. Revisit if a live
  pending response is observed.
- Keep Zod as the only runtime dependency unless a design change is explicitly
  approved.
- Keep transport failures credential-safe: never retain tokens, authorization
  headers, Corporate `X-Sign` or `X-Key-Id` headers, Request objects, or raw API
  response bodies. Redact every configured credential from an upstream message,
  because a proxy can echo what was submitted.
- Never follow HTTP redirects. Fetch preserves custom headers such as
  `X-Token` across a cross-origin redirect and replays the method and body on
  307/308, and endpoint validation only vets the initial URL, so the transport
  sets `redirect: "error"` and surfaces a redirect as a network failure. An
  injected `FetchLike` that ignores `RequestInit.redirect` voids this
  protection, so document the requirement wherever `fetch` is offered.
- Keep webhook verification failures material-safe: never retain raw body,
  public-key, or signature input in public errors.
- Verify Acquiring signatures against the exact wire bytes with standard Web
  Crypto; do not introduce Node-only crypto imports into the browser surface.
- Retry only safe GET requests. Never retry mutating requests automatically;
  the retry policy gates on `method === "GET"`, so POST and DELETE are excluded
  structurally as well as by their `retryable` flag.
- Keep endpoint input validation ahead of Fetch.
- Keep one primary reusable runtime abstraction per source file.
- Never use untyped `any`, broad lint suppressions, coverage ignores, or unsafe
  type assertions to bypass a contract.

## Change Workflow

1. Confirm the intended API contract against current official Monobank
   documentation when endpoint behavior is involved.
2. Write the smallest failing runtime or type test that demonstrates the
   desired consumer-visible behavior.
3. Make the smallest implementation that passes it.
4. Update schemas, inferred types, fixtures, JSDoc, README examples, and agent
   guidance together when the public contract changes.
5. Run the focused test, then `pnpm verify`.

Do not probe live Personal endpoints to discover contracts. Use official
documentation and synthetic fixtures.

## Public API Checklist

For every new or changed public export:

- export it intentionally from `src/index.ts`
- add meaningful JSDoc for the export and every public class member
- document authentication, units, rate limits, retry eligibility,
  cancellation, validation, and thrown SDK errors where relevant
- add runtime tests for behavior
- add declaration/type tests for TypeScript consumers
- keep ESM, CommonJS, and browser-bundler compatibility
- verify the packed tarball, not only the source tree
- update `README.md`, `docs/API.md`, and `llms.txt`

## Verification Standard

The repository requires:

- strict TypeScript with additional safety flags
- ESLint with zero warnings and JSDoc enforcement
- Prettier formatting
- 100% statements, branches, functions, and lines coverage
- type-level public API tests
- Knip with config hints treated as errors
- JSCPD with zero accepted duplication
- ESM, CommonJS, declaration, browser, and packed-package checks
- agreement between the declared `engines.node` floor, the lowest Node major in
  the CI matrix, and the `@types/node` major, so a supported runtime is always a
  tested runtime
- every client family inside `publicApiFiles` in `eslint.config.mjs` and asserted
  by `tests/consumers/declarations.mjs`, so JSDoc is both required at lint time
  and proven to survive into the packed declarations

Run everything with:

```sh
pnpm verify
```

Never weaken a threshold, exclude relevant files, or add suppressions merely to
make verification pass.

## Documentation Rules

- Examples must compile conceptually against current root exports.
- Use synthetic tokens, identifiers, URLs, timestamps, and payloads.
- State security boundaries next to sensitive examples.
- Explain wire units and unusual upstream casing.
- Avoid promises the SDK does not implement.
- Never describe the coverage as complete. The operation counts live in
  `README.md`, `llms.txt`, and this file; changing coverage means updating all
  three together.
- Keep `README.md` human-friendly, `docs/API.md` exhaustive for the implemented
  surface, `llms.txt` compact and discoverable, and this file operational.

## Commits and Releases

Commit messages follow the Lore protocol: begin with an intent line explaining
why the change exists, then add only useful `Constraint:`, `Rejected:`,
`Confidence:`, `Scope-risk:`, `Directive:`, `Tested:`, and `Not-tested:`
trailers.

Do not publish, create tags, or create GitHub Releases unless the user
explicitly requests a release. Follow `RELEASING.md` for an authorized release.
