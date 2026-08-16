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
- Construct `MonobankPersonalClient` with a validated Personal token.
- Construct `MonobankAcquiringClient` with a separate validated Acquiring token.
- Never hardcode, log, serialize, or commit real tokens or API payloads.
- Treat all monetary integers as minor currency units.
- Treat statement and rate timestamps as Unix seconds; `serverTimeMsec` is Unix
  milliseconds.
- Use `AccountType` and `CashbackType` instead of repeating their wire strings.
- Pass an `AbortSignal` when a caller needs cancellation.
- Configure retries only when the application accepts repeated safe GET calls.
  `setWebhook()` is never retried by the SDK.
- Narrow caught errors with the exported SDK error classes. Do not assume every
  failure is an HTTP error.
- Treat `parsePersonalWebhookEvent()` as shape validation only. Authenticate
  webhook delivery separately before acting on it.
- Use only documented Acquiring methods. The current Acquiring surface contains
  `getMerchantDetails()`; do not invent unimplemented invoice or payment calls.

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

  const info = await client.getClientInfo({ signal });
  const account = info.accounts[0];

  if (account === undefined) {
    return [];
  }

  return await client.getStatements(
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
- `MonobankAcquiringClient`
- `AccountType` and `CashbackType`
- response schemas for accounts, bank sync, client info, currency rates, jars,
  managed clients, merchant details, statements, and Personal webhook events
- `parsePersonalWebhookEvent`
- Personal and Acquiring request, response, transport, retry, and error types
- `MonobankApiError`, `MonobankNetworkError`,
  `MonobankResponseValidationError`, and `MonobankValidationError`

Read `docs/API.md` for the complete consumer reference and `src/index.ts` for
the authoritative export list. Read the generated declarations or source JSDoc
before generating calls; do not guess arguments.

## Repository Map

```text
src/index.ts                    public package boundary
src/acquiring/                 Acquiring client, schemas, and types
src/personal/                   Personal client, inputs, schemas, and types
src/transport/                  Fetch transport, retry, timeout, and parsing
src/errors/                     public credential-safe error classes
tests/fixtures/                 synthetic Monobank contract fixtures
tests/types/                    compile-time public API assertions
tests/consumers/                ESM, CJS, browser, declaration, and tarball smoke tests
.github/workflows/ci.yml        Node 20/22/24 verification matrix
.github/workflows/release.yml   npm trusted-publishing workflow
```

## Architectural Invariants

- Preserve the separation between Personal and Acquiring credentials and clients.
- Send Personal `X-Token` only to `/personal/*` and Acquiring `X-Token` only to
  `/api/merchant/*`. Public `/bank/*` requests must never receive either token.
- Parse every successful JSON response through its matching Zod Mini schema.
- Use loose response objects so validated additive upstream fields survive.
- Keep Zod as the only runtime dependency unless a design change is explicitly
  approved.
- Keep transport failures credential-safe: never retain tokens, authorization
  headers, Request objects, or raw API response bodies.
- Retry only safe GET requests. Never retry mutating requests automatically.
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
