## Summary

<!-- What changes, in a sentence or two. -->

## Why

<!-- Why this change exists. If it changes endpoint behavior, link the current
official Monobank documentation that establishes the contract. -->

## Checklist

- [ ] `pnpm verify` passes locally
- [ ] Behavior changes were written test-first, with the RED failure confirmed
      before the implementation
- [ ] Coverage stayed at 100% without adding an ignore, suppression, or lowered
      threshold
- [ ] Every new consumer-facing export and public class member has meaningful
      JSDoc covering authentication, retry eligibility, units, cancellation,
      validation, and thrown SDK errors where relevant
- [ ] Public API changes update runtime tests, type tests, consumer smoke
      checks, `README.md`, `docs/API.md`, and `llms.txt` together
- [ ] Mutating endpoints are not retryable
- [ ] No real tokens, statements, account identifiers, or other banking
      payloads appear in the diff, tests, fixtures, or this description
- [ ] Commit messages follow the Lore protocol described in `CONTRIBUTING.md`

## Validation

<!-- Paste the relevant `pnpm verify` results: test count, coverage, and any
package-consumer checks that matter for this change. -->
