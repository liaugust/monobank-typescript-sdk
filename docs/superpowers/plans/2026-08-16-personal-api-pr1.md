# Personal API PR 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a private, production-ready `@liaugust/monobank-sdk` package foundation with complete Monobank Open API public and Personal endpoint coverage.

**Architecture:** `MonobankPersonalClient` owns the Personal token and exposes Promise-based endpoint methods. Focused Zod Mini schemas validate every successful response, while a shared Fetch-based transport owns timeouts, cancellation, safe opt-in retries, error normalization, and credential redaction without leaking transport details through the public API.

**Tech Stack:** Node.js 20+, TypeScript 6.0.3, pnpm 11.22.0, Zod 4.4.3 (`zod/mini`), tsup 8.5.1, Vitest 4.1.10 with V8 coverage, ESLint 9.39.5, typescript-eslint 8.67.0, eslint-plugin-jsdoc 62.9.0, Prettier 3.9.6, Knip 6.32.2, JSCPD 5.0.15, publint 0.3.23, Are The Types Wrong 0.18.5, and GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-16-monobank-typescript-sdk-design.md`

## Global Constraints

- Package name: `@liaugust/monobank-sdk`; repository name: `monobank-typescript-sdk`.
- Repository and package remain private; PR 1 must not publish to npm or deploy anything.
- Runtime support: Node.js 20+ and modern browsers.
- Runtime dependencies: `zod@4.4.3` only; do not add Effect.
- Public API style: Promise-based, named exports, separate Personal and Acquiring clients; PR 1 implements only `MonobankPersonalClient`.
- API base URL: `https://api.monobank.ua` by default; a custom absolute HTTP(S) base URL is allowed for testing and controlled environments.
- Authentication: `X-Token` is sent only to `/personal/*`; public `/bank/*` requests must not receive it.
- Response schemas validate known fields, preserve unknown additive fields, and throw a credential-safe `MonobankResponseValidationError` on mismatch.
- Automatic retries are disabled by default; configured retries apply only to safe GET requests and never to `POST /personal/webhook`.
- Statement windows may not exceed 2,682,000 seconds; requests are not silently split or delayed in PR 1.
- Coverage must remain at 100% for statements, branches, functions, and lines across maintained production source.
- ESLint runs type-aware strict and stylistic presets with zero warnings; suppressions must be narrow and described.
- Every exported class, constructor, public method, error class, configuration interface/property, schema, parser, and other consumer-facing declaration has meaningful JSDoc enforced by ESLint; private/protected members, internal helpers, tests, and fixtures are excluded.
- JSDoc explains non-type behavior such as authentication, retry eligibility, rate limits, units, cancellation, validation, and thrown public errors. It must not merely restate names or TypeScript types.
- JSCPD uses `threshold: 0`, `minLines: 5`, and `minTokens: 75` across `src` and `tests`.
- Every task uses test-first implementation for runtime behavior and ends with a Lore-protocol commit.

---

## Locked File Structure

```text
.
├── .github/workflows/ci.yml              # PR and main verification matrix
├── .husky/pre-push                       # Runs the authoritative verification command
├── docs/superpowers/specs/...             # Approved design contract
├── docs/superpowers/plans/...             # This execution plan
├── src/
│   ├── errors/
│   │   ├── monobank-api-error.ts          # Non-2xx HTTP failure
│   │   ├── monobank-network-error.ts      # Network, timeout, or caller abort failure
│   │   ├── monobank-response-validation-error.ts
│   │   └── monobank-validation-error.ts   # Invalid SDK configuration or method input
│   ├── personal/
│   │   ├── account.ts                     # Account schema and inferred type
│   │   ├── bank-sync.ts                   # /bank/sync schema and inferred type
│   │   ├── client-info.ts                 # Client response schema and inferred type
│   │   ├── currency-rate.ts               # /bank/currency item/list schemas and types
│   │   ├── get-statements-input.ts        # Statement method input contract
│   │   ├── jar.ts                         # Jar schema and inferred type
│   │   ├── managed-client.ts              # Managed FOP client schemas and types
│   │   ├── monobank-personal-client-options.ts
│   │   ├── monobank-personal-client.ts    # Public endpoint client
│   │   ├── personal-webhook-event.ts      # Incoming Personal webhook schema/parser
│   │   ├── request-options.ts             # Per-call AbortSignal
│   │   ├── set-webhook-input.ts           # Outgoing webhook configuration
│   │   └── statement-item.ts              # Statement item/list schemas and types
│   ├── transport/
│   │   ├── fetch-like.ts                  # Structural Fetch signature
│   │   ├── parse-retry-after.ts           # Retry-After seconds/date parser
│   │   ├── response-schema.ts             # Structural safeParse contract
│   │   ├── retry-options.ts               # Public bounded retry configuration
│   │   └── transport.ts                   # Fetch, timeout, abort, retry, and parsing
│   └── index.ts                            # Deliberate public package surface
├── tests/
│   ├── consumers/
│   │   ├── browser.ts
│   │   ├── commonjs.cjs
│   │   ├── declarations.mjs
│   │   └── esm.mjs
│   ├── fixtures/
│   │   └── personal-api.ts                # Redacted official-shaped payload fixtures
│   ├── support/
│   │   └── create-fetch-sequence.ts       # Reusable deterministic Fetch mock
│   └── types/
│       ├── public-api.test-d.ts
│       └── tsconfig.json
├── .gitignore
├── .jscpd.json
├── .node-version
├── .npmrc
├── .nvmrc
├── .prettierignore
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── SECURITY.md
├── eslint.config.mjs
├── knip.json
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

Files may be split further only when a file would otherwise own more than one independently reusable runtime abstraction. Do not combine the error classes or domain schemas into catch-all files.

---

### Task 1: Strict Package Foundation

**Files:**

- Create: `package.json`
- Create: `.node-version`
- Create: `.nvmrc`
- Create: `.npmrc`
- Create: `.gitignore`
- Create: `.prettierignore`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `knip.json`
- Create: `.jscpd.json`
- Create: `AGENTS.md`
- Create: `src/index.ts`
- Create: `pnpm-lock.yaml` through pnpm

**Interfaces:**

- Consumes: Approved design specification and the strict configuration policy adapted from `liaugust/launch-with-vibe`.
- Produces: A buildable private package, one authoritative `pnpm verify` command, and a stable toolchain for every later task.

- [ ] **Step 1: Create the PR branch from the verified design commit**

Run:

```bash
git status --short --branch
git switch -c feat/personal-api
```

Expected: the starting tree is clean and the new branch points at the plan commit on `main`.

- [ ] **Step 2: Create package metadata and install exact dependencies**

Create `package.json` with this initial contract:

```json
{
  "name": "@liaugust/monobank-sdk",
  "version": "0.0.0",
  "private": true,
  "description": "Strict, runtime-validated TypeScript SDK for Monobank APIs",
  "license": "UNLICENSED",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": ">=20" },
  "packageManager": "pnpm@11.22.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md", "SECURITY.md"],
  "scripts": {
    "prepare": "husky",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:types": "tsc -p tests/types/tsconfig.json --noEmit",
    "check:dead-code": "knip",
    "check:duplication": "jscpd",
    "build": "tsup",
    "check:package": "publint && attw --pack . && node tests/consumers/esm.mjs && node tests/consumers/commonjs.cjs && node tests/consumers/declarations.mjs && tsup tests/consumers/browser.ts --format esm --platform browser --out-dir .tmp/browser-smoke --clean",
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm test:types && pnpm check:dead-code && pnpm check:duplication && pnpm build && pnpm check:package"
  }
}
```

Run:

```bash
pnpm add zod@4.4.3
pnpm add -D @arethetypeswrong/cli@0.18.5 @types/node@20.19.43 @vitest/coverage-v8@4.1.10 eslint@9.39.5 eslint-plugin-import-x@4.17.1 eslint-plugin-jsdoc@62.9.0 eslint-plugin-simple-import-sort@14.0.0 husky@9.1.7 jscpd@5.0.15 knip@6.32.2 prettier@3.9.6 publint@0.3.23 tsup@8.5.1 typescript@6.0.3 typescript-eslint@8.67.0 vitest@4.1.10
```

Expected: `pnpm-lock.yaml` is created, `zod` is the only entry under `dependencies`, and Effect is absent.

- [ ] **Step 3: Add the strict TypeScript and build configuration**

Create `tsconfig.json` with the approved flags:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "erasableSyntaxOnly": true,
    "moduleDetection": "force",
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedSideEffectImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true,
    "forceConsistentCasingInFileNames": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "noEmit": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "*.ts"],
  "exclude": ["dist", ".tmp", "coverage", "node_modules"]
}
```

Create `tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  external: ["zod"],
  format: ["esm", "cjs"],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
  sourcemap: true,
  splitting: false,
  target: "es2022",
  treeshake: true,
});
```

Set both `.node-version` and `.nvmrc` to `20.19.5`. Set `.npmrc` to `engine-strict=true` and `save-exact=true`.

Create `.gitignore`:

```gitignore
.DS_Store
.tmp/
coverage/
dist/
node_modules/
*.tgz
```

Create `.prettierignore`:

```gitignore
.tmp/
coverage/
dist/
node_modules/
pnpm-lock.yaml
```

- [ ] **Step 4: Add strict lint, formatting, dead-code, duplication, and coverage gates**

Build `eslint.config.mjs` from these exact layers:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import importX from "eslint-plugin-import-x";
import jsdoc from "eslint-plugin-jsdoc";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

const publicApiFiles = [
  "src/errors/*.ts",
  "src/personal/*.ts",
  "src/transport/fetch-like.ts",
  "src/transport/retry-options.ts",
];
const sourceFiles = ["**/*.{js,mjs,cjs,ts,mts,cts}"];
const typedFiles = ["**/*.{ts,mts,cts}"];
const defaultExportFiles = [
  "eslint.config.mjs",
  "tsup.config.ts",
  "vitest.config.ts",
];

function rulesFrom(configurations) {
  return Object.assign({}, ...configurations.map(({ rules }) => rules));
}

export default defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
  },
  {
    files: typedFiles,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      ...rulesFrom(tseslint.configs.strictTypeChecked),
      ...rulesFrom(tseslint.configs.stylisticTypeChecked),
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          minimumDescriptionLength: 10,
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
      "@typescript-eslint/consistent-type-exports": [
        "error",
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "separate-type-imports", prefer: "type-imports" },
      ],
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        {
          allowDefaultCaseForExhaustiveSwitch: false,
          considerDefaultExhaustiveForUnions: false,
          requireDefaultForNonUnion: true,
        },
      ],
    },
  },
  {
    files: sourceFiles,
    plugins: { "import-x": importX, "simple-import-sort": simpleImportSort },
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
      "import-x/no-default-export": "error",
      "no-console": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-nested-ternary": "error",
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Pass validated runtime configuration into the SDK instead.",
        },
      ],
      "no-script-url": "error",
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",
    },
  },
  {
    files: publicApiFiles,
    ignores: ["**/*.test.ts"],
    plugins: { jsdoc },
    rules: {
      ...jsdoc.configs["flat/recommended-typescript-error"].rules,
      "jsdoc/informative-docs": "error",
      "jsdoc/require-description": "error",
      "jsdoc/require-jsdoc": [
        "error",
        {
          contexts: [
            "VariableDeclaration",
            "TSInterfaceDeclaration",
            "TSTypeAliasDeclaration",
            "TSMethodSignature",
            "TSPropertySignature",
            "MethodDefinition:not([accessibility='private']):not([accessibility='protected'])",
            "PropertyDefinition:not([accessibility='private']):not([accessibility='protected'])",
          ],
          publicOnly: {
            ancestorsOnly: true,
            cjs: false,
            esm: true,
            window: false,
          },
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            ClassExpression: true,
            FunctionDeclaration: true,
            FunctionExpression: true,
            MethodDefinition: false,
          },
        },
      ],
      "jsdoc/require-param-description": "error",
      "jsdoc/require-returns-description": "error",
    },
  },
  { files: defaultExportFiles, rules: { "import-x/no-default-export": "off" } },
  globalIgnores([
    ".husky/**",
    ".tmp/**",
    "coverage/**",
    "dist/**",
    "node_modules/**",
  ]),
]);
```

Create `.jscpd.json`:

```json
{
  "exitCode": 1,
  "minLines": 5,
  "minTokens": 75,
  "path": ["src", "tests"],
  "reporters": ["console"],
  "silent": true,
  "threshold": 0
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/**/*.test.ts"],
      include: ["src/**/*.ts"],
      provider: "v8",
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

Create `knip.json`:

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": ["src/index.ts", "tsup.config.ts", "vitest.config.ts"],
  "project": ["src/**/*.ts", "*.ts"]
}
```

- [ ] **Step 5: Add repository guidance and verify the empty package foundation**

Create `AGENTS.md` with this repository-local contract (the global workspace instructions remain authoritative where they are stricter):

```md
# Monobank TypeScript SDK Contributor Contract

## Invariants

- Preserve the separation between Personal and Acquiring credentials and clients.
- Send `X-Token` only to authenticated Personal endpoints.
- Parse every successful upstream payload through its Zod Mini schema.
- Keep Zod as the only runtime dependency unless a design change is explicitly approved.
- Maintain 100% statements, branches, functions, and lines coverage.
- Document every consumer-facing export and public class member with meaningful JSDoc.
- Keep one primary reusable runtime abstraction per source file.
- Never use broad lint suppressions, coverage ignores, or untyped `any` escapes.

## Change Workflow

1. Write a failing test for runtime behavior before implementation.
2. Make the smallest implementation that passes it.
3. Run the focused test, then `pnpm verify` before completion.
4. Update official-contract fixtures, schemas, types, and documentation together.

## Lore Commits

Commit messages start with an intent line explaining why the change exists. Add
the applicable `Constraint:`, `Rejected:`, `Confidence:`, `Scope-risk:`,
`Directive:`, `Tested:`, and `Not-tested:` trailers as a concise decision record.
```

Create `src/index.ts` containing only:

```ts
export {};
```

Run:

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm check:dead-code
pnpm check:duplication
```

Expected: every command passes; package verification is intentionally deferred until the public exports exist.

- [ ] **Step 6: Commit the foundation**

```bash
git add AGENTS.md package.json pnpm-lock.yaml .node-version .nvmrc .npmrc .gitignore .prettierignore tsconfig.json tsup.config.ts eslint.config.mjs vitest.config.ts knip.json .jscpd.json src/index.ts
git commit -m "Establish strict gates before adding banking behavior" \
  -m "Constraint: PR 1 requires one reproducible verification contract and zero untested production branches.
Rejected: Framework-specific lint presets | The SDK needs a smaller library-focused policy.
Confidence: high
Scope-risk: moderate
Directive: Do not weaken strictness, coverage, dead-code, or duplication gates to make a change pass.
Tested: format, lint, typecheck, build, Knip, and JSCPD.
Not-tested: Runtime package surface; endpoint implementation has not started."
```

---

### Task 2: Public Error Model and Response Boundary

**Files:**

- Create: `src/errors/monobank-api-error.ts`
- Create: `src/errors/monobank-network-error.ts`
- Create: `src/errors/monobank-response-validation-error.ts`
- Create: `src/errors/monobank-validation-error.ts`
- Create: `src/errors/errors.test.ts`
- Create: `src/transport/response-schema.ts`
- Create: `src/transport/parse-retry-after.ts`
- Create: `src/transport/parse-retry-after.test.ts`

**Interfaces:**

- Consumes: Standard `Error`, `Headers`, and a structural schema contract.
- Produces: `MonobankApiError`, `MonobankNetworkError`, `MonobankResponseValidationError`, `MonobankValidationError`, `ResponseSchema<T>`, and `parseRetryAfter(value, nowMs)` for the transport.

- [ ] **Step 1: Write failing error and Retry-After tests**

Add assertions with these observable contracts:

```ts
it("keeps API metadata without including credentials", () => {
  const error = new MonobankApiError({
    endpoint: "/personal/client-info",
    headers: { "retry-after": "60" },
    message: "Too many requests",
    retryAfterMs: 60_000,
    status: 429,
  });

  expect(error).toMatchObject({
    name: "MonobankApiError",
    endpoint: "/personal/client-info",
    status: 429,
    retryAfterMs: 60_000,
  });
  expect(JSON.stringify(error)).not.toContain("X-Token");
});

it.each([
  ["60", Date.UTC(2026, 7, 16), 60_000],
  ["Sun, 16 Aug 2026 12:01:00 GMT", Date.UTC(2026, 7, 16, 12), 60_000],
  ["invalid", Date.UTC(2026, 7, 16), undefined],
  [null, Date.UTC(2026, 7, 16), undefined],
])("parses Retry-After %s", (value, nowMs, expected) => {
  expect(parseRetryAfter(value, nowMs)).toBe(expected);
});
```

Also test negative dates clamp to `0`, network reasons are limited to `"network" | "timeout" | "aborted"`, validation errors retain only safe issue text, and response validation issues expose code/path/message without retaining the raw response.

- [ ] **Step 2: Run the focused tests and confirm the missing-module failure**

Run:

```bash
pnpm vitest run src/errors/errors.test.ts src/transport/parse-retry-after.test.ts
```

Expected: FAIL because the four errors and parser do not exist.

- [ ] **Step 3: Implement the minimal public errors and structural schema interface**

Use these exact public shapes:

```ts
export interface MonobankApiErrorOptions {
  readonly endpoint: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly message: string;
  readonly retryAfterMs?: number;
  readonly status: number;
  readonly upstreamMessage?: string;
}

export type MonobankNetworkErrorReason = "aborted" | "network" | "timeout";

export interface ResponseValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path: readonly PropertyKey[];
}

export interface ResponseSchema<T> {
  safeParse(input: unknown):
    | { readonly success: true; readonly data: T }
    | {
        readonly success: false;
        readonly error: {
          readonly issues: readonly ResponseValidationIssue[];
        };
      };
}
```

Each error class extends `Error`, assigns a stable `name`, uses `override readonly cause` only where a cause is safe, and never stores a token, Request object, full response body, or raw Zod error.

Add public JSDoc to every error class, constructor, options interface, and exposed property. Describe when consumers receive each error and which fields are safe for diagnostics; do not repeat the TypeScript type as prose.

Implement `parseRetryAfter` as:

```ts
export function parseRetryAfter(
  value: string | null,
  nowMs: number,
): number | undefined {
  if (value === null) {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000);
  }

  const dateMs = Date.parse(value);
  return Number.isNaN(dateMs) ? undefined : Math.max(0, dateMs - nowMs);
}
```

- [ ] **Step 4: Run focused tests and coverage**

Run:

```bash
pnpm vitest run src/errors/errors.test.ts src/transport/parse-retry-after.test.ts --coverage
```

Expected: PASS with 100% coverage for the files introduced in this task.

- [ ] **Step 5: Commit the error boundary**

```bash
git add src/errors src/transport/response-schema.ts src/transport/parse-retry-after.ts src/transport/parse-retry-after.test.ts
git commit -m "Make upstream failures safe and inspectable" \
  -m "Constraint: Banking diagnostics must remain actionable without retaining credentials or raw personal payloads.
Rejected: Exposing native fetch and Zod errors | Their shapes are unstable and may retain sensitive context.
Confidence: high
Scope-risk: narrow
Directive: Add new failure categories through the public error model instead of leaking implementation errors.
Tested: Focused Vitest suite with 100% coverage."
```

---

### Task 3: Fetch Transport, Parsing, and Authentication Isolation

**Files:**

- Create: `src/transport/fetch-like.ts`
- Create: `src/transport/retry-options.ts`
- Create: `src/transport/transport.ts`
- Create: `src/transport/transport.test.ts`
- Create: `tests/support/create-fetch-sequence.ts`

**Interfaces:**

- Consumes: `ResponseSchema<T>`, the four public errors, `parseRetryAfter`, global Fetch types, and optional Personal token.
- Produces: internal `MonobankTransport`, public `RetryOptions`, and `FetchLike` used by `MonobankPersonalClient`.

- [ ] **Step 1: Write failing transport contract tests**

Create the shared Fetch support with one queued result consumed per call:

```ts
import { vi } from "vitest";

import type { FetchLike } from "../../src/transport/fetch-like.js";

export function createFetchSequence(results: readonly (Error | Response)[]) {
  const queue = [...results];

  return vi.fn<FetchLike>(async () => {
    const result = queue.shift();
    if (result === undefined) {
      throw new Error("Fetch sequence exhausted");
    }
    if (result instanceof Error) {
      throw result;
    }

    return result;
  });
}

export function jsonResponse(
  value: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(value), { ...init, headers });
}
```

In `transport.test.ts`, define the structural success schema once:

```ts
import * as z from "zod/mini";

const passthroughSchema = z.looseObject({ ok: z.boolean() });
```

Cover these exact cases with `createFetchSequence`:

```ts
it("never sends the token to public endpoints", async () => {
  const fetch = createFetchSequence([jsonResponse({ ok: true })]);
  const transport = new MonobankTransport({ fetch, token: "secret-token" });

  await transport.getJson({
    auth: false,
    endpoint: "/bank/sync",
    schema: passthroughSchema,
  });

  const [, init] = fetch.mock.calls[0] ?? [];
  expect(new Headers(init?.headers).has("X-Token")).toBe(false);
});

it("sends the token only for authenticated requests", async () => {
  const fetch = createFetchSequence([jsonResponse({ ok: true })]);
  const transport = new MonobankTransport({ fetch, token: "secret-token" });

  await transport.getJson({
    auth: true,
    endpoint: "/personal/client-info",
    schema: passthroughSchema,
  });

  const [, init] = fetch.mock.calls[0] ?? [];
  expect(new Headers(init?.headers).get("X-Token")).toBe("secret-token");
});
```

Add cases for base URL normalization, Accept and Content-Type headers, JSON success, empty success, malformed success JSON, schema failure, JSON/text/HTML/empty error bodies, `errorDescription`, safe response-header copying, and absence of token text from every thrown message/object.

- [ ] **Step 2: Run the focused transport tests and verify failure**

Run:

```bash
pnpm vitest run src/transport/transport.test.ts
```

Expected: FAIL because `MonobankTransport` and Fetch test support do not exist.

- [ ] **Step 3: Implement configuration validation and request execution**

Use these transport contracts:

```ts
export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface RetryOptions {
  readonly baseDelayMs: number;
  readonly maxAttempts: number;
  readonly maxDelayMs: number;
}

interface TransportOptions {
  readonly baseUrl?: string;
  readonly fetch?: FetchLike;
  readonly retry?: RetryOptions;
  readonly timeoutMs?: number;
  readonly token: string;
}

interface JsonRequest<T> {
  readonly auth: boolean;
  readonly body?: unknown;
  readonly endpoint: string;
  readonly retryable?: boolean;
  readonly schema: ResponseSchema<T>;
  readonly signal?: AbortSignal;
}

interface EmptyRequest {
  readonly auth: boolean;
  readonly body?: unknown;
  readonly endpoint: string;
  readonly signal?: AbortSignal;
}

class MonobankTransport {
  constructor(options: TransportOptions);

  getJson<T>(request: JsonRequest<T>): Promise<T>;
  postJson<T>(request: JsonRequest<T>): Promise<T>;
  postEmpty(request: EmptyRequest): Promise<void>;
}
```

`MonobankTransport` must:

1. Reject empty/whitespace-surrounded tokens, non-HTTP(S) base URLs, non-positive timeouts, and invalid retry bounds with `MonobankValidationError`.
2. Default to `https://api.monobank.ua`, global Fetch, a 10,000 ms timeout, and no retries.
3. Set `Accept: application/json`; set `Content-Type` only when a JSON body exists.
4. Set `X-Token` only when `auth: true`.
5. Treat successful empty responses through `postEmpty` and JSON responses through `getJson`/`postJson`; these wrappers select the HTTP method so callers cannot provide a contradictory method value.
6. Parse error payloads defensively and keep only `errorDescription` or at most the first 1,024 characters of safe text in `MonobankApiError`.
7. Convert schema issues to `MonobankResponseValidationError` without retaining the input payload.

- [ ] **Step 4: Run transport tests and full static checks**

Run:

```bash
pnpm vitest run src/transport/transport.test.ts --coverage
pnpm lint
pnpm typecheck
```

Expected: all commands pass and transport source is at 100% coverage.

- [ ] **Step 5: Commit the transport core**

```bash
git add src/transport tests/support/create-fetch-sequence.ts
git commit -m "Keep credentials and response parsing inside one transport boundary" \
  -m "Constraint: Public endpoints must never receive the Personal token and malformed success payloads must not escape validation.
Rejected: Passing Request objects through public errors | They can retain headers and couple consumers to Fetch internals.
Confidence: high
Scope-risk: moderate
Directive: Route every endpoint through MonobankTransport and declare authentication explicitly per request.
Tested: Transport unit suite with 100% coverage, lint, and typecheck."
```

---

### Task 4: Timeout, Cancellation, and Safe Opt-in Retries

**Files:**

- Modify: `src/transport/transport.ts`
- Modify: `src/transport/transport.test.ts`

**Interfaces:**

- Consumes: `RetryOptions`, `parseRetryAfter`, request `retryable`, caller `AbortSignal`, and Fetch failures.
- Produces: bounded retry timing and stable `MonobankNetworkError` reasons without changing endpoint APIs.

- [ ] **Step 1: Add failing fake-timer tests for reliability behavior**

Define the safe GET helper used throughout the reliability cases:

```ts
function requestSafeGet(transport: MonobankTransport) {
  return transport.getJson({
    auth: true,
    endpoint: "/personal/client-info",
    retryable: true,
    schema: passthroughSchema,
  });
}
```

Write cases proving:

```ts
it("does not retry unless a retry policy is configured", async () => {
  const fetch = createFetchSequence([new Response(null, { status: 503 })]);
  const transport = new MonobankTransport({ fetch, token: "token" });

  await expect(requestSafeGet(transport)).rejects.toMatchObject({
    status: 503,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("honors Retry-After for a configured safe GET", async () => {
  vi.useFakeTimers();
  const fetch = createFetchSequence([
    new Response(null, { headers: { "Retry-After": "2" }, status: 429 }),
    jsonResponse({ ok: true }),
  ]);
  const transport = new MonobankTransport({
    fetch,
    retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 5_000 },
    token: "token",
  });

  const result = requestSafeGet(transport);
  await vi.advanceTimersByTimeAsync(1_999);
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await expect(result).resolves.toEqual({ ok: true });
});
```

Also prove exponential delay capping, retryable statuses `429/500/502/503/504`, retryable network failures, no retries for POST or schema/authentication failures, caller abort during Fetch and delay, timeout classification, listener/timer cleanup, and maximum-attempt termination.

- [ ] **Step 2: Run the reliability tests and confirm failure**

Run:

```bash
pnpm vitest run src/transport/transport.test.ts -t "retry|abort|timeout"
```

Expected: FAIL because the transport executes only one attempt and does not yet classify abort reasons.

- [ ] **Step 3: Implement the bounded attempt loop**

Use the following policy exactly:

```ts
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function retryDelayMs(
  attempt: number,
  retryAfterMs: number | undefined,
  policy: RetryOptions,
): number | undefined {
  if (retryAfterMs !== undefined) {
    return retryAfterMs <= policy.maxDelayMs ? retryAfterMs : undefined;
  }

  return Math.min(policy.baseDelayMs * 2 ** (attempt - 1), policy.maxDelayMs);
}
```

An attempt may continue only when the request is marked `retryable`, a policy exists, the method is `GET`, the failure is a retryable status or network failure, and the next attempt number does not exceed `maxAttempts`. When Monobank supplies `Retry-After`, wait for the full value; if it exceeds `maxDelayMs`, stop and surface the API error instead of retrying early. Use an abort-aware delay; never catch and retry `MonobankResponseValidationError`, `MonobankValidationError`, 401, 403, or caller abort.

- [ ] **Step 4: Run focused and full coverage**

Run:

```bash
pnpm vitest run src/transport/transport.test.ts --coverage
pnpm test:coverage
```

Expected: both pass at 100% for every coverage dimension.

- [ ] **Step 5: Commit the reliability policy**

```bash
git add src/transport/transport.ts src/transport/transport.test.ts
git commit -m "Make retries explicit and safe for read-only calls" \
  -m "Constraint: Payment-adjacent mutations must never be repeated implicitly and rate-limit timing must remain observable.
Rejected: Default automatic retries | They hide latency and can duplicate future mutating operations.
Confidence: high
Scope-risk: moderate
Directive: Mark retries per endpoint; POST requests remain non-retryable regardless of client policy.
Tested: Fake-timer reliability suite and full 100% coverage run."
```

---

### Task 5: Public Currency and Bank Synchronization Endpoints

**Files:**

- Create: `src/personal/currency-rate.ts`
- Create: `src/personal/currency-rate.test.ts`
- Create: `src/personal/bank-sync.ts`
- Create: `src/personal/bank-sync.test.ts`
- Create: `src/personal/request-options.ts`
- Create: `src/personal/monobank-personal-client-options.ts`
- Create: `src/personal/monobank-personal-client.ts`
- Create: `src/personal/monobank-personal-client.test.ts`
- Create: `tests/fixtures/personal-api.ts`

**Interfaces:**

- Consumes: `MonobankTransport`, `FetchLike`, `RetryOptions`, and Zod Mini.
- Produces: `CurrencyRate`, `BankSync`, `MonobankPersonalClientOptions`, `RequestOptions`, `MonobankPersonalClient#getCurrencyRates`, and `MonobankPersonalClient#getBankSync`.

- [ ] **Step 1: Write failing schema tests from redacted official payloads**

Use exact fixture shapes:

```ts
export const currencyRateFixture = {
  currencyCodeA: 840,
  currencyCodeB: 980,
  date: 1_552_392_228,
  rateBuy: 27.2,
  rateSell: 27,
} as const;

export const bankSyncFixture = {
  serverKeyId: "2626ff34473bb66260b930af946fa9641a06bcd4",
  serverPubKey:
    "BNDZP+AGoRC+ER1plDSUCHOw2/aBNIocmD2gS/v34/b0iQ1HBo+oS3/f402e3OXA5uCxakSjuxGMP6X0XP9VIUk=",
  serverTimeMsec: 1_755_509_467_397,
} as const;
```

Test valid buy/sell and cross rates, rejection when all three rate fields are absent, integer currency/date fields, required sync fields, invalid types, and preservation of an unknown additive field.

- [ ] **Step 2: Run schema tests and confirm failure**

Run:

```bash
pnpm vitest run src/personal/currency-rate.test.ts src/personal/bank-sync.test.ts
```

Expected: FAIL because the schemas do not exist.

- [ ] **Step 3: Implement loose response schemas and inferred types**

Implement schemas with this structure:

```ts
import * as z from "zod/mini";

export const currencyRateSchema = z
  .looseObject({
    currencyCodeA: z.int(),
    currencyCodeB: z.int(),
    date: z.int(),
    rateBuy: z.optional(z.number()),
    rateCross: z.optional(z.number()),
    rateSell: z.optional(z.number()),
  })
  .check(
    z.refine(
      ({ rateBuy, rateCross, rateSell }) =>
        rateBuy !== undefined ||
        rateCross !== undefined ||
        rateSell !== undefined,
      { message: "At least one exchange rate is required" },
    ),
  );

export const currencyRatesSchema = z.array(currencyRateSchema);
export type CurrencyRate = z.infer<typeof currencyRateSchema>;
```

`bankSyncSchema` is a loose object with required `serverKeyId: string`, `serverPubKey: string`, and integer `serverTimeMsec`.

Document each exported schema and inferred type with its wire-level purpose and units. In particular, identify currency codes as ISO 4217 numeric values, currency dates as Unix seconds, and `serverTimeMsec` as Unix milliseconds.

- [ ] **Step 4: Write failing public endpoint tests**

Assert exact requests and results:

```ts
it("loads public currency rates without X-Token", async () => {
  const fetch = createFetchSequence([jsonResponse([currencyRateFixture])]);
  const client = new MonobankPersonalClient({ fetch, token: "personal-token" });

  await expect(client.getCurrencyRates()).resolves.toEqual([
    currencyRateFixture,
  ]);
  expect(fetch).toHaveBeenCalledWith(
    new URL("https://api.monobank.ua/bank/currency"),
    expect.objectContaining({ method: "GET" }),
  );
  expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).has("X-Token")).toBe(
    false,
  );
});
```

Add equivalent `/bank/sync`, custom base URL, caller signal, malformed payload, and safe retry-policy tests.

- [ ] **Step 5: Implement the Personal client shell and public methods**

Use these signatures:

```ts
export interface RequestOptions {
  readonly signal?: AbortSignal;
}

export interface MonobankPersonalClientOptions {
  readonly baseUrl?: string;
  readonly fetch?: FetchLike;
  readonly retry?: RetryOptions;
  readonly timeoutMs?: number;
  readonly token: string;
}

export class MonobankPersonalClient {
  constructor(options: MonobankPersonalClientOptions);
  getBankSync(options?: RequestOptions): Promise<BankSync>;
  getCurrencyRates(options?: RequestOptions): Promise<readonly CurrencyRate[]>;
}
```

Both methods use `auth: false`, `retryable: true`, and their endpoint-specific schemas.

Document the client constructor and both methods before running lint. The class-level JSDoc includes an injected-Fetch `@example`; method JSDoc states that these calls are public, safe-retry eligible only when the caller configures retries, cancellable through `RequestOptions.signal`, and capable of throwing the four applicable public SDK errors.

- [ ] **Step 6: Run focused tests, coverage, and commit**

Run:

```bash
pnpm vitest run src/personal/currency-rate.test.ts src/personal/bank-sync.test.ts src/personal/monobank-personal-client.test.ts --coverage
pnpm lint
pnpm typecheck
```

Expected: PASS and 100% coverage.

```bash
git add src/personal tests/fixtures/personal-api.ts
git commit -m "Expose validated public Monobank data without credential leakage" \
  -m "Constraint: /bank endpoints are public and must not receive a Personal token.
Rejected: Separate public client | The approved package architecture has explicit Personal and Acquiring clients only.
Confidence: high
Scope-risk: narrow
Directive: New /bank methods must declare auth false and validate additive response shapes.
Tested: Endpoint/schema suites with 100% coverage, lint, and typecheck."
```

---

### Task 6: Client Information, Accounts, Jars, and Managed Clients

**Files:**

- Create: `src/personal/account.ts`
- Create: `src/personal/account.test.ts`
- Create: `src/personal/jar.ts`
- Create: `src/personal/jar.test.ts`
- Create: `src/personal/managed-client.ts`
- Create: `src/personal/managed-client.test.ts`
- Create: `src/personal/client-info.ts`
- Create: `src/personal/client-info.test.ts`
- Modify: `src/personal/monobank-personal-client.ts`
- Modify: `src/personal/monobank-personal-client.test.ts`
- Modify: `tests/fixtures/personal-api.ts`

**Interfaces:**

- Consumes: Personal transport authentication and Zod Mini.
- Produces: `accountSchema`/`Account`, `jarSchema`/`Jar`, `managedAccountSchema`/`ManagedAccount`, `managedClientSchema`/`ManagedClient`, `clientInfoSchema`/`ClientInfo`, and `MonobankPersonalClient#getClientInfo`.

- [ ] **Step 1: Add redacted fixtures and failing domain schema tests**

The fixture must include all documented shapes:

```ts
export const clientInfoFixture = {
  accounts: [
    {
      balance: 10_000_000,
      cashbackType: "UAH",
      creditLimit: 10_000_000,
      currencyCode: 980,
      iban: "UA733220010000026201234567890",
      id: "account-id",
      maskedPan: ["537541******1234"],
      sendId: "send-id",
      type: "black",
    },
  ],
  clientId: "client-id",
  jars: [
    {
      balance: 1_000_000,
      currencyCode: 980,
      description: "Redacted goal",
      goal: 10_000_000,
      id: "jar-id",
      sendId: "jar-send-id",
      title: "Redacted jar",
    },
  ],
  managedClients: [
    {
      accounts: [
        {
          balance: 10_000_000,
          creditLimit: 0,
          currencyCode: 980,
          iban: "UA733220010000026201234567891",
          id: "managed-account-id",
          type: "fop",
        },
      ],
      clientId: "managed-client-id",
      name: "Redacted Person",
      tin: "1234567890",
    },
  ],
  name: "Redacted Person",
  permissions: "psfj",
  webHookUrl: "https://example.test/mono-hook",
} as const;
```

Test every account enum (`black`, `white`, `platinum`, `iron`, `fop`, `yellow`, `eAid`), every cashback enum (`None`, `UAH`, `Miles`), managed account type `fop`, string TIN, an omitted `managedClients` collection for accounts without delegated FOP access, malformed nested fields, and unknown additive fields at every object level.

- [ ] **Step 2: Run schema tests and verify failure**

Run:

```bash
pnpm vitest run src/personal/account.test.ts src/personal/jar.test.ts src/personal/managed-client.test.ts src/personal/client-info.test.ts
```

Expected: FAIL because the nested schemas are missing.

- [ ] **Step 3: Implement schema composition with inferred types**

Use `z.looseObject` for every API object and `z.array` for collections. The required account fields are `id`, `sendId`, `balance`, `creditLimit`, `type`, `currencyCode`, `cashbackType`, `maskedPan`, and `iban`. The required client fields are `clientId`, `name`, `webHookUrl`, `permissions`, `accounts`, and `jars`; `managedClients` is optional because it is a newly documented capability that is not present for every Personal account. Infer each exported type from its schema; do not duplicate interfaces by hand.

Add meaningful JSDoc for every exported schema/type and for `getClientInfo`. Document integer monetary values as minor currency units, permission characters as upstream capability flags, the authenticated 60-second rate limit, configured safe-retry behavior, cancellation, and applicable public SDK errors.

Representative account definition:

```ts
export const accountSchema = z.looseObject({
  balance: z.int(),
  cashbackType: z.enum(["None", "UAH", "Miles"]),
  creditLimit: z.int(),
  currencyCode: z.int(),
  iban: z.string(),
  id: z.string(),
  maskedPan: z.array(z.string()),
  sendId: z.string(),
  type: z.enum(["black", "white", "platinum", "iron", "fop", "yellow", "eAid"]),
});
```

- [ ] **Step 4: Add and satisfy the authenticated endpoint test**

Add:

```ts
it("gets client info with X-Token and validates nested data", async () => {
  const fetch = createFetchSequence([jsonResponse(clientInfoFixture)]);
  const client = new MonobankPersonalClient({ fetch, token: "personal-token" });

  await expect(client.getClientInfo()).resolves.toEqual(clientInfoFixture);
  expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get("X-Token")).toBe(
    "personal-token",
  );
});
```

Implement:

```ts
getClientInfo(options?: RequestOptions): Promise<ClientInfo>
```

It calls `GET /personal/client-info` with `auth: true`, `retryable: true`, and `clientInfoSchema`. Add malformed payload, upstream error, signal, and retry tests.

- [ ] **Step 5: Run full coverage and commit**

Run:

```bash
pnpm test:coverage
pnpm lint
pnpm typecheck
```

Expected: PASS at 100% across all four metrics.

```bash
git add src/personal tests/fixtures/personal-api.ts
git commit -m "Validate complete Personal client account data" \
  -m "Constraint: Nested account, jar, and managed-client payloads cross an untrusted network boundary.
Rejected: Handwritten response interfaces | They can drift from runtime parsing.
Confidence: high
Scope-risk: moderate
Directive: Derive exported response types from loose Zod schemas and preserve additive fields.
Tested: Full suite at 100% coverage, lint, and typecheck."
```

---

### Task 7: Statements and Personal Webhooks

**Files:**

- Create: `src/personal/statement-item.ts`
- Create: `src/personal/statement-item.test.ts`
- Create: `src/personal/get-statements-input.ts`
- Create: `src/personal/get-statements-input.test.ts`
- Create: `src/personal/set-webhook-input.ts`
- Create: `src/personal/set-webhook-input.test.ts`
- Create: `src/personal/personal-webhook-event.ts`
- Create: `src/personal/personal-webhook-event.test.ts`
- Modify: `src/personal/monobank-personal-client.ts`
- Modify: `src/personal/monobank-personal-client.test.ts`
- Modify: `tests/fixtures/personal-api.ts`

**Interfaces:**

- Consumes: `MonobankTransport`, `RequestOptions`, Zod Mini, and the client token.
- Produces: `StatementItem`, `GetStatementsInput`, `SetWebhookInput`, `PersonalWebhookEvent`, `parsePersonalWebhookEvent`, `getStatements`, and `setWebhook`.

- [ ] **Step 1: Write failing StatementItem and webhook-event schema tests**

Use a fully populated redacted statement fixture with required fields `id`, `time`, `description`, `mcc`, `originalMcc`, `hold`, `amount`, `operationAmount`, `currencyCode`, `commissionRate`, `cashbackAmount`, and `balance`; optional fields are `comment`, `receiptId`, `invoiceId`, `counterEdrpou`, `counterIban`, and `counterName`.

Define the webhook fixture shape exactly:

```ts
export const personalWebhookEventFixture = {
  data: {
    account: "account-id",
    statementItem: statementItemFixture,
  },
  type: "StatementItem",
} as const;
```

Test required/optional statement fields, invalid scalar types, additive fields, exact webhook literal type, missing nested account, and malformed statement data.

- [ ] **Step 2: Run schema tests and verify failure**

Run:

```bash
pnpm vitest run src/personal/statement-item.test.ts src/personal/personal-webhook-event.test.ts
```

Expected: FAIL because schemas and parser do not exist.

- [ ] **Step 3: Implement statement and webhook schemas**

Use loose schemas and inferred types. Export:

```ts
export const statementItemSchema = z.looseObject({
  amount: z.int(),
  balance: z.int(),
  cashbackAmount: z.int(),
  comment: z.optional(z.string()),
  commissionRate: z.int(),
  counterEdrpou: z.optional(z.string()),
  counterIban: z.optional(z.string()),
  counterName: z.optional(z.string()),
  currencyCode: z.int(),
  description: z.string(),
  hold: z.boolean(),
  id: z.string(),
  invoiceId: z.optional(z.string()),
  mcc: z.int(),
  operationAmount: z.int(),
  originalMcc: z.int(),
  receiptId: z.optional(z.string()),
  time: z.int(),
});

export const statementItemsSchema = z.array(statementItemSchema);
```

`parsePersonalWebhookEvent(input: unknown)` must use `safeParse` and throw `MonobankResponseValidationError` with endpoint context `"personal-webhook-event"`; it must not retain the raw webhook payload.

Document all exported statement/webhook schemas and input types. `parsePersonalWebhookEvent` gets a focused `@example`, explicitly states that parsing does not authenticate the sender, and documents its validation error without implying webhook signature verification.

- [ ] **Step 4: Write failing method-input and endpoint tests**

Cover `Date | number` conversion and boundaries:

```ts
it("builds an encoded statement path from Date inputs", async () => {
  const fetch = createFetchSequence([jsonResponse([statementItemFixture])]);
  const client = new MonobankPersonalClient({ fetch, token: "personal-token" });

  await client.getStatements({
    account: "jar/id",
    from: new Date("2026-08-01T00:00:00.000Z"),
    to: new Date("2026-08-02T00:00:00.000Z"),
  });

  expect(fetch.mock.calls[0]?.[0].toString()).toBe(
    "https://api.monobank.ua/personal/statement/jar%2Fid/1785542400/1785628800",
  );
});
```

Add tests for omitted `to`, default account `"0"`, invalid Date, negative/fractional Unix time, empty account, `from > to`, a 2,682,000-second accepted window, a 2,682,001-second rejected window, token header, malformed response, signal, and retry.

For webhook configuration, test absolute HTTP/HTTPS URLs, empty string removal, rejection of relative/non-HTTP URLs, exact JSON body, empty 200 response, signal propagation, upstream failure, and one Fetch call even when retry policy exists.

- [ ] **Step 5: Implement method inputs and endpoint methods**

Use exact signatures:

```ts
export type UnixTimeInput = Date | number;

export interface GetStatementsInput {
  readonly account: string;
  readonly from: UnixTimeInput;
  readonly to?: UnixTimeInput;
}

export interface SetWebhookInput {
  readonly webHookUrl: string;
}

getStatements(
  input: GetStatementsInput,
  options?: RequestOptions
): Promise<readonly StatementItem[]>;

setWebhook(
  input: SetWebhookInput,
  options?: RequestOptions
): Promise<void>;
```

`getStatements` calls authenticated retryable GET. `setWebhook` calls authenticated non-retryable POST with `{ webHookUrl }` and accepts an empty successful body. Input failures throw `MonobankValidationError` before Fetch is called.

Both methods require focused JSDoc `@example` blocks. `getStatements` documents Unix-second normalization, the 2,682,000-second maximum window, the 60-second endpoint rate limit, safe configured retries, cancellation, and applicable errors. `setWebhook` documents authentication, cancellation, validation, and its invariant that automatic retries never apply.

- [ ] **Step 6: Run complete behavior verification and commit**

Run:

```bash
pnpm test:coverage
pnpm lint
pnpm typecheck
pnpm check:duplication
```

Expected: all pass; coverage remains 100% and JSCPD reports zero clones.

```bash
git add src/personal tests/fixtures/personal-api.ts
git commit -m "Complete Personal statements and webhook contracts" \
  -m "Constraint: Statement windows are rate-limited and webhook mutation must never be retried implicitly.
Rejected: Silent statement splitting | It would hide minute-scale delays and rate-limit behavior.
Confidence: high
Scope-risk: moderate
Directive: Keep statement limits explicit and authenticate incoming webhook data separately from schema parsing.
Tested: Full 100% coverage suite, lint, typecheck, and zero-duplication check."
```

---

### Task 8: Public Exports, Consumer Contracts, and Documentation

**Files:**

- Modify: `src/index.ts`
- Create: `src/index.test.ts`
- Create: `tests/types/public-api.test-d.ts`
- Create: `tests/types/tsconfig.json`
- Create: `tests/consumers/esm.mjs`
- Create: `tests/consumers/commonjs.cjs`
- Create: `tests/consumers/declarations.mjs`
- Create: `tests/consumers/browser.ts`
- Create: `README.md`
- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Modify: `knip.json`
- Modify: `.prettierignore`

**Interfaces:**

- Consumes: All PR 1 public clients, errors, schemas, types, and built artifacts.
- Produces: The deliberate package API, compile-time usage contract, retained declaration JSDoc, ESM/CommonJS/browser smoke coverage, and user documentation.

- [ ] **Step 1: Write failing public export and type-contract tests**

`src/index.test.ts` must import `* as sdk` and assert these runtime export keys exactly: `MonobankApiError`, `MonobankNetworkError`, `MonobankPersonalClient`, `MonobankResponseValidationError`, `MonobankValidationError`, `accountSchema`, `bankSyncSchema`, `clientInfoSchema`, `currencyRateSchema`, `currencyRatesSchema`, `jarSchema`, `managedAccountSchema`, `managedClientSchema`, `personalWebhookEventSchema`, `parsePersonalWebhookEvent`, `statementItemSchema`, and `statementItemsSchema`. Inferred types disappear at runtime.

Create `tests/types/public-api.test-d.ts` with representative use:

```ts
import {
  MonobankPersonalClient,
  type Account,
  type ClientInfo,
  type CurrencyRate,
  type GetStatementsInput,
  type PersonalWebhookEvent,
} from "@liaugust/monobank-sdk";

const client = new MonobankPersonalClient({ token: "token" });
const input: GetStatementsInput = { account: "0", from: new Date(0) };
const statements = client.getStatements(input);
const clientInfo: Promise<ClientInfo> = client.getClientInfo();
const rates: Promise<readonly CurrencyRate[]> = client.getCurrencyRates();
declare const account: Account;
declare const webhookEvent: PersonalWebhookEvent;

void statements;
void clientInfo;
void rates;
void account;
void webhookEvent;

// @ts-expect-error -- Personal token is required by the public constructor.
new MonobankPersonalClient({});

// @ts-expect-error -- Statement start time must be a Date or Unix number.
client.getStatements({ account: "0", from: "2026-08-01" });
```

Create `tests/types/tsconfig.json` so the tests exercise the package name rather than relative internals:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": "../..",
    "noEmit": true,
    "paths": {
      "@liaugust/monobank-sdk": ["./src/index.ts"]
    },
    "types": ["node"]
  },
  "include": ["./public-api.test-d.ts"]
}
```

- [ ] **Step 2: Run export and type tests and confirm failure**

Run:

```bash
pnpm vitest run src/index.test.ts
pnpm test:types
```

Expected: FAIL because `src/index.ts` exports nothing.

- [ ] **Step 3: Add deliberate named exports and pass type tests**

Export every approved runtime item and type explicitly; do not use `export *`. Example pattern:

```ts
export { MonobankApiError } from "./errors/monobank-api-error.js";
export { MonobankPersonalClient } from "./personal/monobank-personal-client.js";
export { accountSchema } from "./personal/account.js";
export type { Account } from "./personal/account.js";
export type { GetStatementsInput } from "./personal/get-statements-input.js";
```

Run the two focused commands again. Expected: PASS.

Update `knip.json` now that all test and consumer entry points exist:

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": [
    "src/index.ts",
    "src/**/*.test.ts",
    "tests/consumers/*.{ts,mjs,cjs}",
    "tests/types/public-api.test-d.ts",
    "tsup.config.ts",
    "vitest.config.ts"
  ],
  "project": ["src/**/*.ts", "tests/**/*.ts", "*.ts"]
}
```

- [ ] **Step 4: Add built-package smoke consumers**

`tests/consumers/esm.mjs` imports from `../../dist/index.js`; `commonjs.cjs` requires `../../dist/index.cjs`; both instantiate the client with an injected Fetch stub and assert exported constructors exist without calling Monobank. `browser.ts` imports the package self-reference and instantiates the client with browser Fetch types so tsup proves there is no Node-only runtime import.

Create `tests/consumers/declarations.mjs` using `node:assert/strict`, `node:fs/promises`, and the existing `typescript` dev dependency. Parse `dist/index.d.ts` with `ts.createSourceFile`, locate `MonobankPersonalClient`, and assert that the class, constructor, `getBankSync`, `getCurrencyRates`, `getClientInfo`, `getStatements`, and `setWebhook` each retain at least one `JSDocComment` node. Also assert that all four exported error classes retain class-level JSDoc. Fail with the missing declaration name in the assertion message; do not use fragile whole-file snapshots.

All public source JSDoc must use descriptions rather than duplicate TypeScript types. The client class has a runnable `@example`; each endpoint method documents authentication, retry eligibility, cancellation, relevant rate/window limits, and its possible public SDK errors with `@throws`. `getStatements`, `setWebhook`, and `parsePersonalWebhookEvent` include focused `@example` blocks because their boundary behavior is not obvious from their signatures.

Run:

```bash
pnpm build
pnpm check:package
```

Expected: publint and Are The Types Wrong pass, Node ESM/CommonJS consumers exit zero, declaration JSDoc is present in the built `.d.ts`, and the browser bundle builds successfully.

- [ ] **Step 5: Write user and contributor documentation**

`README.md` must include:

1. Private-package status and unofficial-SDK disclaimer.
2. Node.js 20+/browser support and installation guidance that states the package is not yet published.
3. Constructor and injected Fetch examples.
4. Currency, bank sync, client info, statement, webhook setup, and webhook parsing examples.
5. Exact 60-second Personal client/statement limits, 5-minute currency caching, and 2,682,000-second statement window.
6. Retry-disabled-by-default behavior and safe GET-only opt-in example.
7. Error narrowing examples for all four error classes.
8. Raw credential handling and no-live-token CI policy.
9. A note that exported JSDoc is available through editor IntelliSense and the generated declarations.

`SECURITY.md` must instruct private vulnerability reporting through GitHub Security Advisories and prohibit issues containing tokens or personal payloads. `CONTRIBUTING.md` must require Node 20+, pnpm 11.22.0, test-first changes, public JSDoc for every consumer-facing API change, Lore commits, `pnpm verify`, and official Monobank documentation evidence for contract changes.

- [ ] **Step 6: Run the authoritative verification and commit**

Run:

```bash
pnpm format
pnpm verify
```

Expected: every gate passes, including 100% coverage, JSDoc lint/declaration checks, type consumers, zero duplication, build, publint, Are The Types Wrong, and runtime/browser smoke checks.

```bash
git add src/index.ts src/index.test.ts tests README.md SECURITY.md CONTRIBUTING.md knip.json .prettierignore
git commit -m "Make the Personal SDK contract consumable across runtimes" \
  -m "Constraint: Consumers need one documented named-export surface that works in Node ESM, CommonJS, and browsers.
Rejected: Wildcard exports | They make accidental internals part of the compatibility contract.
Confidence: high
Scope-risk: moderate
Directive: Treat index exports and README examples as versioned public API.
Tested: pnpm verify including 100% coverage, JSDoc declaration checks, type tests, package analysis, and consumer smoke builds."
```

---

### Task 9: CI, Pre-push Enforcement, and Draft PR

**Files:**

- Create: `.husky/pre-push`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` only if CI badge/result wording is added after the workflow exists

**Interfaces:**

- Consumes: `pnpm verify`, exact Node/pnpm versions, and GitHub repository permissions.
- Produces: Identical local and remote completion gates plus the sequential PR 1 review surface.

- [ ] **Step 1: Add pre-push enforcement**

Create `.husky/pre-push`:

```sh
pnpm verify
```

Run:

```bash
pnpm prepare
test -x .husky/pre-push
```

Expected: Husky is initialized and the hook is executable.

- [ ] **Step 2: Add the GitHub Actions matrix**

Create `.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Verify Node ${{ matrix.node-version }}
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        node-version: [20, 22, 24]
    steps:
      - name: Check out repository
        uses: actions/checkout@v7.0.1
        with:
          persist-credentials: false
      - name: Install pnpm
        uses: pnpm/action-setup@v6.0.10
        with:
          run_install: false
          version: 11.22.0
      - name: Set up Node.js
        uses: actions/setup-node@v7.0.0
        with:
          cache: pnpm
          cache-dependency-path: pnpm-lock.yaml
          node-version: ${{ matrix.node-version }}
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Verify repository
        run: pnpm verify
```

- [ ] **Step 3: Run clean-install-equivalent local verification**

Run:

```bash
pnpm install --frozen-lockfile
pnpm verify
git diff --check
git status --short
```

Expected: all checks pass; status shows only the intended CI/hook files before commit.

- [ ] **Step 4: Commit CI enforcement**

```bash
git add .husky/pre-push .github/workflows/ci.yml README.md
git commit -m "Require the same proof before push and merge" \
  -m "Constraint: PR 1 must pass on every supported Node major with no local/CI gate drift.
Rejected: Separate reduced CI scripts | They allow local-only success and stale enforcement.
Confidence: high
Scope-risk: narrow
Directive: Keep pnpm verify authoritative and update local, hook, and CI behavior together.
Tested: Frozen install, full pnpm verify, and git diff validation."
```

- [ ] **Step 5: Push the feature branch and open the draft PR**

Run:

```bash
git push -u origin feat/personal-api
gh pr create --draft --base main --head feat/personal-api \
  --title "Build the validated Monobank Personal SDK foundation" \
  --body "## Outcome
- establishes the strict private SDK package and shared transport
- covers every current public and Personal Open API endpoint
- validates responses with Zod Mini and preserves additive fields
- enforces 100% coverage, strict static analysis, and multi-runtime package checks

## Safety
- never sends X-Token to public endpoints
- disables retries by default and never retries webhook mutation
- excludes live credentials and personal data from tests and CI

## Verification
- pnpm verify"
```

Expected: a draft PR targeting `main`; no merge is performed in this task.

- [ ] **Step 6: Verify remote checks and review the complete diff**

Run:

```bash
gh pr checks --watch
gh pr diff --name-only
git status --short --branch
```

Expected: all Node matrix checks pass, the diff contains only PR 1 files, and the working tree is clean. If a check fails, reproduce its focused command locally, fix it test-first, rerun `pnpm verify`, push, and re-check until green.

---

## Final Completion Evidence

Before requesting PR review, record all of the following in the PR description:

- `pnpm verify` passes from a frozen-lockfile installation.
- Vitest reports 100% statements, branches, functions, and lines.
- Knip reports no unintended unused files, exports, types, or dependencies.
- JSCPD reports zero clones at the configured five-line/75-token boundary.
- publint and Are The Types Wrong pass against the packed package.
- Node ESM, Node CommonJS, and browser bundle smoke consumers pass.
- ESLint reports complete meaningful JSDoc coverage for the public API, and the generated declaration consumer confirms class/method documentation is retained.
- CI passes on Node 20, 22, and 24.
- Public `/bank/currency` and `/bank/sync` requests omit `X-Token`.
- Authenticated Personal requests include `X-Token` without exposing it in errors.
- The implemented endpoint set is exactly currency, bank sync, client info, webhook configuration, and statements.
- No Acquiring code, npm publication, live token, or live Monobank request is present.
