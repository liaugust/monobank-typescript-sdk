import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");

function readRepositoryFile(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

describe("release readiness", () => {
  it("declares publishable package metadata", () => {
    const packageJson = JSON.parse(
      readRepositoryFile("package.json"),
    ) as Record<string, unknown>;

    expect(packageJson).toMatchObject({
      license: "MIT",
      name: "@liaugust/monobank-sdk",
      publishConfig: {
        access: "public",
        registry: "https://registry.npmjs.org/",
      },
      repository: {
        type: "git",
        url: "git+https://github.com/liaugust/monobank-typescript-sdk.git",
      },
      version: "0.3.0",
    });
    expect(packageJson).not.toHaveProperty("private");
  });

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
    expect(workflow).toContain("node-version: 24.19.0");
    expect(workflow).toContain("package-manager-cache: false");
    expect(workflow).toContain("pnpm verify");
    expect(workflow).toContain('pnpm check:release-tag -- "$RELEASE_TAG"');
    expect(workflow).toContain("npm publish --access public");
    expect(workflow).not.toContain("NODE_AUTH_TOKEN");
    expect(workflow).not.toContain("--provenance");
  });

  it("accepts only a release tag matching the package version", () => {
    const matching = spawnSync("pnpm", ["check:release-tag", "--", "v0.3.0"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
    const mismatching = spawnSync(
      "pnpm",
      ["check:release-tag", "--", "v9.9.9"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
      },
    );

    expect(matching.status).toBe(0);
    expect(mismatching.status).not.toBe(0);
    expect(mismatching.stderr).toContain(
      'Release tag "v9.9.9" must match package version "0.3.0".',
    );
  });

  it("rejects missing or extra release-tag arguments", () => {
    const missing = spawnSync("pnpm", ["check:release-tag"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
    const extra = spawnSync(
      "pnpm",
      ["check:release-tag", "--", "v0.1.0", "unexpected"],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
      },
    );

    expect(missing.status).not.toBe(0);
    expect(extra.status).not.toBe(0);
  });

  it("runs a smoke test against the packed tarball", () => {
    const packageJson = JSON.parse(readRepositoryFile("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      "test:packed-package": "node tests/consumers/packed-package.mjs",
    });
    expect(packageJson.scripts?.["check:package"]).toContain(
      "pnpm test:packed-package",
    );
  });
});
