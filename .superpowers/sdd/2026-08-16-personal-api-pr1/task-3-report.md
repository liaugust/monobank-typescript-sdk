# Task 3 Report — Fetch Transport, Parsing, and Authentication Isolation

## Result

Implemented Task 3 and committed it as:

`d179434 Keep credentials and response parsing inside one transport boundary`

## RED Evidence

Command:

```bash
fnm exec --using 22.22.3 -- pnpm vitest run src/transport/transport.test.ts
```

Observed failure before production implementation:

```text
FAIL src/transport/transport.test.ts
Error: Cannot find module './transport.js' imported from src/transport/transport.test.ts
```

This was the expected missing-module RED for the new transport boundary and shared Fetch test support.

## GREEN Evidence

Focused transport behavior:

```bash
fnm exec --using 22.22.3 -- pnpm vitest run src/transport/transport.test.ts --coverage
```

Result: 22 transport tests passed. The command still exits non-zero because Vitest applies the repository-wide 100% threshold while only the transport suite is selected, leaving Task 2 files intentionally unexecuted in that focused run. The report showed no uncovered lines for `src/transport/transport.ts`.

Authoritative repository coverage:

```bash
fnm exec --using 22.22.3 -- pnpm test:coverage
```

Result: 3 test files passed, 36 tests passed, 100% statements, branches, functions, and lines.

## Static Gates

All commands were run through `fnm exec --using 22.22.3 -- pnpm ...`.

- `pnpm format:check` passed.
- `pnpm lint` passed with zero warnings.
- `pnpm typecheck` passed.
- `pnpm build` passed.
- `pnpm check:dead-code` passed; Knip emitted existing configuration hints only.
- `pnpm check:duplication` passed with 0 exact clones.

## Changed Files

- `src/transport/fetch-like.ts` — added public Fetch-compatible function type with JSDoc.
- `src/transport/retry-options.ts` — added public bounded retry policy type with JSDoc.
- `src/transport/transport.ts` — added internal transport construction, validation, request execution, authentication isolation, success parsing, schema validation, defensive API error parsing, safe header copying, and network error normalization.
- `src/transport/transport.test.ts` — added RED-first transport contract tests for auth headers, URL/defaults, JSON headers/bodies, successful parsing, empty responses, malformed JSON, schema failures, error bodies, safe headers, token redaction, configuration validation, and Fetch failures.
- `tests/support/create-fetch-sequence.ts` — added deterministic queued Fetch test helper and JSON response helper.
- `knip.json` — removed temporary `zod` dependency ignore now that Task 3 imports `zod/mini`.

## Decisions

- Stored validated retry and timeout configuration for Task 4 without implementing attempt loops, timeout orchestration, or cancellation behavior.
- Kept `MonobankTransport` internal to the source tree and did not export transport internals from `src/index.ts`.
- Used a narrow ESLint suppression in one test to cover custom Fetch implementations that reject with non-Error values.
- Redacted the configured token from upstream error text before truncating to 1,024 characters.

## Gaps

- Task 4 still owns actual retry scheduling, timeout behavior, and abort classification.
- The package root remains empty until later public API tasks expose client types.

## Review Repair — CHANGES_REQUIRED

### Regression RED Evidence

Command:

```bash
fnm exec --using 22.22.3 -- pnpm vitest run src/transport/transport.test.ts
```

Observed failures before the repair implementation:

```text
Tests 5 failed | 21 passed
wraps Fetch failures without retaining request credentials
rejects absolute authenticated endpoint before Fetch
rejects protocol-relative authenticated endpoint before Fetch
rejects relative authenticated endpoint before Fetch
rejects authenticated public authenticated endpoint before Fetch
```

The failures proved the reviewed regressions: raw Fetch `Error.cause.message`
could expose `secret-token`, and authenticated absolute/protocol-relative,
non-root-relative, or public endpoint paths reached Fetch instead of failing at
the transport boundary.

### Repair GREEN Evidence

Focused transport suite:

```bash
fnm exec --using 22.22.3 -- pnpm vitest run src/transport/transport.test.ts
```

Result: 1 test file passed, 26 tests passed.

Focused transport coverage:

```bash
fnm exec --using 22.22.3 -- pnpm vitest run src/transport/transport.test.ts --coverage
```

Result: 26 transport tests passed. As before, the command exits non-zero because
the repository-wide 100% coverage threshold includes unselected Task 2 files.

Authoritative repository coverage:

```bash
fnm exec --using 22.22.3 -- pnpm test:coverage
```

Result: 3 test files passed, 40 tests passed, 100% statements, branches,
functions, and lines.

### Repair Static Gates

All commands were run through `fnm exec --using 22.22.3 -- pnpm ...`.

- `pnpm format:check` passed.
- `pnpm lint` passed with zero warnings.
- `pnpm typecheck` passed.
- `pnpm build` passed.
- `pnpm check:dead-code` passed; Knip emitted existing configuration hints only.
- `pnpm check:duplication` passed with 0 exact clones.

### Repair Decisions

- Omitted raw Fetch causes from transport-created `MonobankNetworkError` values
  because Task 3 cannot prove arbitrary Fetch errors are credential-safe.
- Added endpoint validation before URL construction is used for Fetch: endpoints
  must be root-relative, must resolve within the configured base origin, and
  authenticated requests must target `/personal/`.
- Strengthened schema-failure assertions to check endpoint, issue fields, error
  class, and absence of raw payload/token strings across recursive thrown
  properties.
