# Releasing

Releases are published from GitHub Releases through npm trusted publishing.
The workflow never uses a long-lived npm publish token.

## One-time setup

1. Publish version `0.0.1` interactively as the one-time bootstrap release so
   `@liaugust/monobank-sdk` exists on npm. Do not create a GitHub Release for
   this version, and do not store the publishing credential in GitHub.
2. Create a GitHub environment named `npm`.
3. In the npm package settings, add a GitHub Actions trusted publisher with:
   - organization or user: `liaugust`
   - repository: `monobank-typescript-sdk`
   - workflow filename: `release.yml`
   - environment: `npm`
   - allowed action: `npm publish`
4. Restrict or revoke npm write tokens after the trusted publisher succeeds.

The current GitHub plan does not support required reviewers for environments
in private repositories, so the `npm` environment has no protection rules.
Enable a required reviewer if the repository plan gains that capability.

The first trusted-publishing release should be `0.1.0`. Prepare it in a new
pull request only after the bootstrap publication and trusted-publisher setup
are complete.

Trusted publishing requires a GitHub-hosted runner, Node.js 22.14.0 or newer,
npm 11.5.1 or newer, and `id-token: write`. The workflow uses Node.js 24.19.0
and does not set `NODE_AUTH_TOKEN`.

Private GitHub repositories do not receive npm provenance attestations, even
when publishing a public package through trusted publishing. The workflow does
not claim or request provenance while this repository remains private.

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
