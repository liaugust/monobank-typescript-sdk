# Releasing

Releases are published from GitHub Releases through npm trusted publishing.
The workflow never uses a long-lived npm publish token.

## One-time setup

1. Make the initial `@liaugust/monobank-sdk` publication interactively so the
   package exists on npm. Do not store that credential in GitHub.
2. Create a GitHub environment named `npm` and require approval for deployments.
3. In the npm package settings, add a GitHub Actions trusted publisher with:
   - organization or user: `liaugust`
   - repository: `monobank-typescript-sdk`
   - workflow filename: `release.yml`
   - environment: `npm`
   - allowed action: `npm publish`
4. Restrict or revoke npm write tokens after the trusted publisher succeeds.

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
5. Approve the `npm` environment deployment and verify the package on npm.

The release workflow rejects a GitHub Release whose tag does not exactly match
the package version. It verifies the repository, builds and tests the packed
tarball, then publishes the public scoped package through npm OIDC.
