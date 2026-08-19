# Agent Guide: @liaugust/monobank-sdk

This file is the operating contract for coding agents that use or modify this
package. Prefer repository code and tests over memory, and prefer official
Monobank documentation over inferred API behavior.

## Package Mission

Provide a strict TypeScript boundary around Monobank APIs without leaking
credentials or trusting upstream JSON. The package is unofficial and must not
claim endorsement by Monobank.

## Rules for Consumer Code

- Import public values and types only from `@liaugust/monobank-sdk`.
- Construct `MonobankPublicClient` without a token for `/bank/*` calls.
- Construct `MonobankPersonalClient` with a validated Personal token.
- Construct `MonobankAcquiringClient` with a separate validated Acquiring token.
- Construct `MonobankCorporateClient` with a service `keyId` and a `sign`
  function. It takes no token. Omit `keyId` only for the registration flow,
  which is what issues it. Never place a private key inside the SDK or in
  application logs; the signer is the only thing that touches it.
- Never hardcode, log, serialize, or commit real tokens or API payloads.
- Treat all monetary integers as minor currency units.
- Treat rate and Personal statement timestamps as Unix seconds. Acquiring
  statement request inputs use Unix seconds and response dates use RFC-3339;
  `serverTimeMsec` is Unix milliseconds.
- Use `AccountType` and `CashbackType` instead of repeating their wire strings.
- Use the exported statement, invoice, payment, cancellation, discount, wallet,
  and fiscal enum-like values instead of repeating their wire strings.
- Pass an `AbortSignal` when a caller needs cancellation.
- Configure retries only when the application accepts repeated safe GET calls.
  Mutating Personal and Acquiring methods are never retried by the SDK.
- Narrow caught errors with the exported SDK error classes. Do not assume every
  failure is an HTTP error.
- Treat `parsePersonalWebhookEvent()` as shape validation only. Authenticate
  webhook delivery separately before acting on it.
- Authenticate Acquiring webhooks with `verifyAcquiringWebhookSignature()`
  over the exact raw request bytes before parsing or transforming the body.
- Cache the result of `acquiring.webhooks.getPublicKey()` in application
  infrastructure and refresh it only after verification with the cached key
  fails; the SDK intentionally does not own cache policy.
- Use only documented Acquiring methods. The current surface contains merchant
  every documented Acquiring endpoint: merchant details, submerchant listing,
  employee listing, QR listing, details, and amount reset, statements, the
  wallet listing, token payment, and card removal, and invoice creation,
  status, cancellation, removal, finalization, receipt, fiscal checks, direct
  payment, and synchronous payment. Do not invent calls beyond that set.
- Treat a Corporate `sign` result as credential material; the SDK sends it as
  `X-Sign` and never logs it. Return base64 of the raw 64-byte `r || s` pair, not
  DER. Monobank documents neither the digest nor whether the signed `URL` includes
  the query, so both are unverified assumptions.
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
- fourteen resource properties exposed through the four parent clients: `bank`,
  `currency`, `client`, Personal `statements`, Personal `webhooks`, `merchant`,
  `employees`, `invoices`, Acquiring `statements`, `submerchants`, `qr`,
  `wallet`, Acquiring `webhooks`, and Corporate `company`
- Personal and Acquiring enum-like const values, including `AccountType`,
  `CashbackType`, `AcquiringPaymentScheme`, `AcquiringQrAmountType`,
  `AcquiringStatementStatus`, `InvoicePaymentType`, and `InvoiceStatus`
- response schemas for accounts, bank sync, client info, currency rates, jars,
  managed clients, merchant details, submerchants, QR cashiers, QR cashier
  details, invoices, receipts, fiscal checks, statements, and Personal webhook
  events
- `parsePersonalWebhookEvent`
- `verifyAcquiringWebhookSignature`
- Personal and Acquiring request, response, transport, retry, and error types
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
src/corporate/client/           Corporate parent client and options
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
src/shared/                     request options, validation, webhook body, unix time
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
  `timeoutMs` does not bound the signer, since no signal is passed into `sign`.
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
  headers, Request objects, or raw API response bodies.
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
- Keep `README.md` human-friendly, `docs/API.md` complete, `llms.txt` compact
  and discoverable, and this file operational.

## Commits and Releases

Commit messages follow the Lore protocol: begin with an intent line explaining
why the change exists, then add only useful `Constraint:`, `Rejected:`,
`Confidence:`, `Scope-risk:`, `Directive:`, `Tested:`, and `Not-tested:`
trailers.

Do not publish, create tags, or create GitHub Releases unless the user
explicitly requests a release. Follow `RELEASING.md` for an authorized release.
