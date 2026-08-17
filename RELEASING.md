# Releasing

Releases are published from GitHub Releases through npm trusted publishing.
The workflow never uses a long-lived npm publish token.

## One-time setup

1. Publish version `0.0.1` interactively as the one-time bootstrap release so
   `@liaugust/monobank-sdk` exists on npm. Do not create a GitHub Release for
   this version, and do not store the publishing credential in GitHub.
2. Create a GitHub environment named `npm`. Because this repository is public,
   environment protection rules are available on current GitHub plans. The
   environment intentionally has no protection rules while a single maintainer
   owns the package, because a required review only that maintainer can give
   blocks the release without adding oversight. Add a required reviewer and
   prevent self-review as soon as a second trusted maintainer exists.
3. In the npm package settings, add a GitHub Actions trusted publisher with:
   - organization or user: `liaugust`
   - repository: `monobank-typescript-sdk`
   - workflow filename: `release.yml`
   - environment: `npm`
   - allowed action: `npm publish`
4. Restrict or revoke npm write tokens after the trusted publisher succeeds.

The first trusted-publishing release should be `0.1.0`. Prepare it in a new
pull request only after the bootstrap publication and trusted-publisher setup
are complete.

Trusted publishing requires a GitHub-hosted runner, Node.js 22.14.0 or newer,
npm 11.5.1 or newer, and `id-token: write`. The workflow uses Node.js 24.19.0
and does not set `NODE_AUTH_TOKEN`.

Because both this repository and the npm package are public, npm trusted
publishing automatically generates a provenance attestation. The workflow
intentionally omits `--provenance`; npm adds provenance automatically for a
trusted publication from GitHub Actions.

## Release procedure

1. Update `package.json` and `CHANGELOG.md` in a pull request.
2. Run `pnpm verify` locally and merge only after review.
3. Create tag `v<package-version>` on the merged `main` commit.
4. Publish a GitHub Release for that tag.
5. Monitor the `npm` environment deployment, approve it if protection rules are
   enabled, and verify the package on npm.

The release workflow rejects a GitHub Release whose tag does not exactly match
the package version. It verifies the repository, builds and tests the packed
tarball, then publishes the public scoped package through npm OIDC.

## Manual live check

The automated suite validates every response against synthetic fixtures, so it
cannot catch a schema that disagrees with production. Two documented behaviors
were found only by calling the live API, so a short manual probe against a
sandbox Acquiring token is worth running before a release that changes schemas
or adds endpoints.

Probe the read-only Acquiring endpoints, plus a created-then-removed test
invoice, and compare the outcome classes:

- `MonobankResponseValidationError` is the finding that matters. It means the
  SDK disagrees with production and the schema must change before release.
- `MonobankApiError` is usually expected. A permission the token lacks answers
  403, an inactive QR cashier answers 404, and an unpaid invoice answers 400
  for its receipt.

Keep the probe outside the repository. It needs a live credential, so it can
never run in CI, and `SECURITY.md` requires the committed test suite to keep
using injected Fetch stubs. Never paste a token into a shell command that lands
in history, a commit, or an issue.
