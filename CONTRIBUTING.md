# Contributing

Use Node.js 20.19.5+ and pnpm 11.22.0. Corepack should select the
package-manager version declared in `package.json`.

All behavior changes are test-first: write the failing test, confirm the RED
failure, then make the smallest implementation that turns it GREEN. Public API
changes must update runtime tests, type tests, consumer smoke checks, and docs
together.

Every consumer-facing export and public class member needs meaningful JSDoc.
Document behavior TypeScript cannot express, including authentication, retry
eligibility, rate limits, units, cancellation, validation, and public SDK
errors.

Contract changes must cite current official Monobank documentation evidence in
the issue, plan, or commit context. Do not broaden endpoint behavior from memory
or live-token experiments.

Before completion, run:

```bash
pnpm verify
```

Commits follow the Lore protocol: start with an intent line that explains why
the change exists, then add useful `Constraint:`, `Rejected:`, `Confidence:`,
`Scope-risk:`, `Directive:`, `Tested:`, and `Not-tested:` trailers.
