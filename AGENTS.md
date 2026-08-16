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
