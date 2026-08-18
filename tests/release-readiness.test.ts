import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");

function readRepositoryFile(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

function declaredVersion(): string {
  const packageJson = JSON.parse(readRepositoryFile("package.json")) as {
    version: string;
  };

  return packageJson.version;
}

function runReleaseTagCheck(...args: readonly string[]) {
  return spawnSync("pnpm", ["check:release-tag", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

describe("release readiness", () => {
  it("provides OIDC trusted publishing with automatic provenance", () => {
    const workflowPath = resolve(
      repositoryRoot,
      ".github/workflows/release.yml",
    );

    expect(existsSync(workflowPath)).toBe(true);
    if (!existsSync(workflowPath)) {
      return;
    }

    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("release:\n    types: [published]");
    expect(workflow).toContain("environment: npm");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("package-manager-cache: false");
    expect(workflow).toContain("pnpm verify");
    expect(workflow).toContain('pnpm check:release-tag -- "$RELEASE_TAG"');
    expect(workflow).toContain("npm publish --access public");
    expect(workflow).not.toContain("NODE_AUTH_TOKEN");
    expect(workflow).not.toContain("--provenance");
  });

  it("accepts only a release tag matching the package version", () => {
    const version = declaredVersion();
    const matching = runReleaseTagCheck("--", `v${version}`);
    const mismatching = runReleaseTagCheck("--", "v9.9.9");

    expect(matching.status).toBe(0);
    expect(mismatching.status).not.toBe(0);
    expect(mismatching.stderr).toContain(
      `Release tag "v9.9.9" must match package version "${version}".`,
    );
  });

  it("rejects missing or extra release-tag arguments", () => {
    const missing = runReleaseTagCheck();
    const extra = runReleaseTagCheck(
      "--",
      `v${declaredVersion()}`,
      "unexpected",
    );

    expect(missing.status).not.toBe(0);
    expect(extra.status).not.toBe(0);
  });
});
