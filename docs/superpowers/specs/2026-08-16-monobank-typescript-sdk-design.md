# Monobank TypeScript SDK Design

**Date:** 2026-08-16  
**Status:** Approved in conversation; awaiting written-spec review  
**Repository:** `monobank-typescript-sdk` (private GitHub repository)  
**Package:** `@liaugust/monobank-sdk` (private until publication is explicitly approved)

## 1. Purpose

Build a strict, runtime-validated TypeScript SDK for Monobank's Personal and
Acquiring APIs. The SDK must work in Node.js 20+ and modern browsers, expose a
predictable API close to Monobank's HTTP contract, and add convenience only
where it does not hide important banking or payment behavior.

The work will ship in two sequential pull requests:

1. Project foundation and complete Personal API support.
2. Core internet Acquiring API support and webhook signature verification.

Broader acquiring features such as QR acquiring, recurring payments, splits,
tokenization, marketplaces, tips/employees, and fiscalization are explicitly
outside these two pull requests.

## 2. Goals

- Provide strongly typed clients for the Personal and Acquiring APIs.
- Validate successful API responses at runtime before returning them.
- Keep Personal and Acquiring credentials and domain behavior separate.
- Support Node.js 20+ and modern browsers through the standard Fetch API.
- Provide actionable, credential-safe errors.
- Make unsafe retry behavior impossible by default.
- Establish strict automated quality gates before endpoint implementation.
- Maintain a reviewable delivery history through focused pull requests.

## 3. Non-goals

- Supporting Node.js versions older than 20.
- Providing a custom HTTP stack or polyfilling `fetch`.
- Automatically retrying mutating payment operations.
- Wrapping every operation in high-level business abstractions.
- Shipping all documented Acquiring product families in the initial release.
- Publishing to npm during the initial implementation.
- Making live banking or payment calls in continuous integration.

## 4. Package Architecture

The SDK will be one npm package with two explicit clients:

```ts
import {
  MonobankAcquiringClient,
  MonobankPersonalClient,
} from "@liaugust/monobank-sdk";
```

`MonobankPersonalClient` and `MonobankAcquiringClient` will share internal
transport, configuration, retry, timeout, and error primitives. Each client
will own its authentication configuration, endpoints, schemas, and domain
helpers. A single client containing both tokens will not be provided.

The initial source layout is expected to follow these boundaries:

```text
src/
  acquiring/       # Added in PR 2
  personal/
  transport/
  errors/
  schemas/
  index.ts
```

Exact file granularity may evolve during planning, but domain clients must not
depend on one another and internal transport details must not leak through the
public API.

## 5. Public API Shape

The API will remain close to the Monobank wire contract while accepting a few
ergonomic inputs:

```ts
const personal = new MonobankPersonalClient({
  token: process.env.MONOBANK_TOKEN!,
});

const client = await personal.getClientInfo();
const statements = await personal.getStatements({
  account: client.accounts[0].id,
  from: new Date("2026-08-01"),
  to: new Date("2026-08-16"),
});
```

Dates used as request parameters may be supplied as `Date` or Unix seconds.
They will be normalized at the request boundary. Successful response values
will otherwise remain faithful to the documented API payload instead of being
silently transformed into richer domain objects.

All requests will support an `AbortSignal`. Client configuration will allow a
custom Fetch-compatible implementation for tests, instrumentation, proxies,
or nonstandard runtimes that supply their own implementation.

Stable public Zod schemas will be exported where they are useful to consumers,
including webhook and persisted-response validation. Internal-only schemas
will not be exported merely because they exist.

## 6. PR 1: Foundation and Personal API

PR 1 will include the package foundation, documentation, continuous
integration, shared transport, shared errors, and complete support for the
documented Personal API surface:

- Currency rates.
- Client information, accounts, and jars.
- Account statements.
- Personal webhook configuration.

The direct endpoint methods are the required scope. A safe statement-window
helper may split requests into valid time windows without concealing rate-limit
failures. The helper must execute sequentially by default to avoid creating a
rate-limit burst.

Monobank's documented endpoint limits will be represented in documentation and
error metadata. The SDK will not use hidden sleeps to make a request appear to
succeed later.

PR 1 will also contain:

- README usage and configuration examples.
- Security guidance for token handling.
- API reference or generated typed documentation.
- Contribution and local validation instructions.
- Package export and packed-artifact verification.

## 7. PR 2: Core Acquiring API

PR 2 will add `MonobankAcquiringClient` without breaking or reshaping the
Personal client. Its initial scope is core internet acquiring:

- Merchant details.
- Invoice creation and status.
- Invoice cancellation, finalization, and invalidation where supported by the
  current official contract.
- Merchant statements.
- Public-key retrieval required for webhook verification.
- Raw-body webhook signature verification.

Before implementation, PR 2 must snapshot the then-current official Acquiring
documentation and confirm exact endpoint names and request/response schemas.
Features belonging to other acquiring product families remain follow-up work.

Webhook verification will require the exact raw request bytes and the `X-Sign`
header. Signature verification must happen before consumers parse or trust the
payload. The SDK will expose a clear verification result and a separately typed
payload schema; it will not imply that parsing alone authenticates a webhook.

## 8. Runtime Response Validation

Zod 4, imported through `zod/mini`, will be the package's sole runtime
dependency. Zod schemas will be the source of truth for successful response
types so handwritten TypeScript declarations cannot drift from runtime
validation.

Schemas will validate documented required fields and known field types while
tolerating unknown additional object fields. This provides protection from
invalid or unexpectedly changed payloads without breaking consumers when
Monobank makes an additive, backward-compatible change.

An invalid successful response will throw `MonobankResponseValidationError`.
It will contain structured validation issues and endpoint context, but it will
not include tokens or indiscriminately attach the full response payload.
Sensitive values must be redacted from diagnostics.

Error responses will be parsed defensively because an upstream or intermediary
may return JSON, text, HTML, or an empty body.

## 9. Transport, Errors, and Reliability

The shared transport will own URL construction, headers, JSON handling,
timeouts, cancellation, response parsing, and error normalization.

The public error hierarchy will include:

- `MonobankApiError` for non-success HTTP responses.
- `MonobankNetworkError` for Fetch-level failures.
- `MonobankValidationError` for invalid SDK inputs.
- `MonobankResponseValidationError` for a successful HTTP response that fails
  its documented runtime schema.

API errors will expose HTTP status, normalized upstream code/message when
available, response headers, endpoint context, and retry timing derived from
standard headers. No error will expose authentication headers.

Automatic retries are disabled by default. An explicitly configured retry
policy may apply only to operations marked safe and idempotent. It must honor
`Retry-After`, support cancellation, use bounded attempts, and avoid retrying
validation or authentication failures. Mutating payment operations will never
be retried automatically by the SDK.

## 10. Tooling and Static Quality Gates

The package manager will be pnpm. The project will use:

- TypeScript in strict mode.
- Type-aware ESLint strict and stylistic rules.
- Prettier as the sole formatting authority.
- Vitest for unit and type-level behavior tests.
- Knip for unused files, exports, types, and dependencies.
- JSCPD for duplication detection.
- tsup for ESM, CommonJS, and declaration builds.

The TypeScript configuration will adapt the strict baseline from the private
`liaugust/launch-with-vibe` repository. It will enable, at minimum:

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `erasableSyntaxOnly`
- `moduleDetection: "force"`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noImplicitOverride`
- `noPropertyAccessFromIndexSignature`
- `noUncheckedSideEffectImports`
- `noUnusedLocals`
- `noUnusedParameters`
- `useUnknownInCatchVariables`
- `forceConsistentCasingInFileNames`
- `allowUnreachableCode: false`
- `allowUnusedLabels: false`
- `isolatedModules`
- `verbatimModuleSyntax`

The library-specific module baseline will use `target: "ES2022"`, the `ES2022`,
`DOM`, and `DOM.Iterable` libraries, `module: "ESNext"`, and
`moduleResolution: "Bundler"`. Application type checking will use `noEmit`;
tsup will own ESM, CommonJS, source-map, and declaration output. `skipLibCheck`
will remain enabled only for dependency declaration internals and must not
conceal errors in repository-owned declarations.

Next.js plugins, JSX settings, application path aliases, and framework-generated
include paths from the reference repository will not be copied.

ESLint will use flat configuration, the TypeScript project service,
`strictTypeChecked`, and `stylisticTypeChecked`. It will report unused disable
directives and unused inline configuration as errors and run with
`--max-warnings 0`. The baseline will additionally enforce:

- Described `@ts-expect-error` directives and rejection of `@ts-ignore` and
  `@ts-nocheck`.
- No explicit `any`, deprecated APIs, or import-type side effects.
- Consistent type imports and exports.
- Exhaustive union switches without redundant default cases.
- Curly braces, strict equality, and rejection of eval-like execution, script
  URLs, nested ternaries, and production `console` calls.
- Named exports by default, with narrow tool-entry exceptions.
- Deterministic import and export ordering.
- No direct `process.env` access in SDK source; credentials and runtime options
  must enter through validated client configuration.

Next.js, React, JSX accessibility, Lingui, localization, feature-folder, and the
reference repository's custom shared-type-guard rules will not be copied.
Formatting rules will not be duplicated in ESLint.

Prettier will use its pinned conventional defaults, with a narrow ignore file
for generated output and package-manager artifacts. `format` will write the
canonical form; `format:check` will verify it without mutation.

Knip must fail CI for unintended unused production surface. Intentional public
exports and tool entry points will be configured explicitly rather than ignored
globally.

JSCPD will scan production source and tests with a zero-duplication threshold,
`minLines: 5`, and `minTokens: 75`. It will exclude only dependencies, build
output, and generated artifacts. Test fixtures are not excluded wholesale.
Any unavoidable declarative-schema exclusion must be narrow, documented, and
approved in review.

One authoritative `pnpm verify` script will compose every non-mutating quality
gate. Local completion checks, the pre-push hook, and GitHub Actions will invoke
that same script so the enforced contract cannot drift across environments.

## 11. Build and Package Contract

The package will expose tree-shakeable named exports and support both ESM and
CommonJS consumers. Type declarations and source maps will be generated. The
package export map will be tested against representative ESM and CommonJS
consumers.

`zod` will be declared as a normal runtime dependency rather than a peer
dependency so consumers receive a working validator installation by default.
The SDK build should not embed a private duplicate of Zod.

The package will remain marked `private` until npm publication is separately
reviewed and approved. CI will still inspect the packed artifact to ensure only
intended files and entry points would be published.

## 12. Testing Strategy

Tests will use an injected mock `fetch`; CI must never require a personal or
merchant token. All maintained production source must be covered by tests. CI
will enforce 100% thresholds for statements, branches, functions, and lines;
falling below any threshold will fail the pull request.

Coverage exclusions are limited to generated artifacts, declaration-only
files, and tooling/configuration files that contain no production behavior.
Blanket directory exclusions, coverage-threshold reductions, and ignore
comments added only to make the metric pass are not acceptable. Any necessary
coverage ignore must document why the code cannot be executed deterministically
and must be approved during review.

Coverage percentage is a floor, not a substitute for behavioral assertions.
Every public endpoint and helper must have success, upstream-error,
malformed-response, and relevant boundary tests. Every public schema must have
representative valid and invalid payload tests. Compile-time tests must cover
the supported public type surface and expected type failures.

Behavioral coverage will include:

- Correct URLs, HTTP methods, headers, query parameters, and request bodies.
- Successful response validation for every endpoint schema.
- Rejection of malformed successful responses.
- Forward compatibility with unknown additive response fields.
- JSON, text, empty, and malformed upstream error bodies.
- Token and sensitive-data redaction.
- Timeout and caller cancellation behavior.
- Disabled-by-default retries and safe-operation retry constraints.
- `Retry-After` handling.
- Date and statement-window boundaries.
- Webhook raw-body verification success and failure cases in PR 2.
- Public export and declaration usability.
- ESM and CommonJS package consumption.

Representative official examples may be converted into redacted fixtures.
Fixtures must not contain real tokens, account identifiers, or personal data.

## 13. Continuous Integration

Every pull request will run independent, deterministic checks for:

1. Lockfile-consistent installation.
2. Prettier formatting.
3. ESLint.
4. TypeScript type checking.
5. Unit, integration-style transport, and type tests.
6. Coverage enforcement at 100% statements, branches, functions, and lines.
7. Knip.
8. JSCPD.
9. Production build.
10. Packed-package contents and consumer smoke tests.

The branch must not be described as complete while a required check is failing.
No workflow will publish packages or deploy external systems during the first
two pull requests.

## 14. Repository and Delivery Workflow

The GitHub repository will be private. The initial design specification may be
committed to `main`; SDK implementation will happen through branches and pull
requests.

PR 1 will contain the foundation and Personal API. It must merge before PR 2 is
opened from an up-to-date `main`, keeping the review sequence and change history
clear. Both pull requests require passing CI and a final review against this
design before merge.

All commits must follow the repository's Lore commit protocol and record
constraints, verification evidence, and known gaps where those details help
future maintainers.

## 15. Security and Privacy

- Tokens are accepted through configuration and sent only in the documented
  authentication header.
- Tokens are never placed in URLs, logs, thrown messages, snapshots, fixtures,
  or telemetry.
- The SDK will not persist credentials or API responses.
- Diagnostic data will be minimal and redacted.
- Webhook authenticity depends on signature verification over the original raw
  body, not a re-serialized object.
- Dependency versions and GitHub Actions will be pinned or managed according to
  the implementation plan's supply-chain policy.

## 16. Completion Criteria

The overall two-PR project is complete when:

- The private repository exists and both pull requests are merged sequentially.
- The Personal API and scoped core Acquiring API are implemented and documented.
- All documented successful responses in scope are runtime-validated.
- Maintained production source has 100% statement, branch, function, and line
  coverage with behavior-focused assertions.
- The required format, lint, typecheck, test, Knip, JSCPD, build, and package
  checks pass from a clean checkout.
- Node.js 20 ESM/CommonJS and a modern-browser bundle path are verified.
- No known credential exposure, unsafe automatic retry, or webhook verification
  defect remains.
- Broader acquiring functionality is clearly tracked as out of scope rather
  than partially implemented.
