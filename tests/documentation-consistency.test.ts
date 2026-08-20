import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");

function readRepositoryFile(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

function readSection(document: string, heading: string): string {
  const start = document.indexOf(heading);
  expect(start, `${heading} must exist`).toBeGreaterThanOrEqual(0);

  const nextHeading = document.indexOf("\n## ", start + heading.length);
  return document.slice(start, nextHeading === -1 ? undefined : nextHeading);
}

function normalizeWhitespace(value: string): string {
  return value
    .replaceAll(/(^|\n)>\s?/g, "$1")
    .replaceAll(/\s+/g, " ")
    .trim();
}

describe("documentation consistency", () => {
  it("keeps local Node selectors on the documented development floor", () => {
    for (const selector of [".node-version", ".nvmrc"]) {
      expect(readRepositoryFile(selector).trim()).toBe("22.22.2");
    }
  });

  it("keeps agent-facing client and resource inventories current", () => {
    const indexSource = readRepositoryFile("src/index.ts");
    const agents = readRepositoryFile("AGENTS.md");
    const llmsRuntimeValues = readSection(
      readRepositoryFile("llms.txt"),
      "## Exported runtime values",
    );
    const acquiringClient = readRepositoryFile(
      "src/acquiring/client/monobank-acquiring-client.ts",
    );
    const installmentsClient = readRepositoryFile(
      "src/installments/client/monobank-installments-client.ts",
    );
    const clients = [
      ...indexSource.matchAll(/export \{ (Monobank[A-Za-z]+Client) \} from/g),
    ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
    const resources = [acquiringClient, installmentsClient].flatMap((source) =>
      [...source.matchAll(/public readonly ([a-z]+):/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      ),
    );

    expect(clients).not.toHaveLength(0);
    expect(resources).not.toHaveLength(0);

    for (const client of clients) {
      expect(agents).toContain(`\`${client}\``);
      expect(llmsRuntimeValues).toContain(`\`${client}\``);
    }

    for (const resource of resources) {
      expect(agents).toContain(`\`${resource}\``);
    }
  });

  it("documents every exported runtime schema in the API reference", () => {
    const indexSource = readRepositoryFile("src/index.ts");
    const schemaReference = readSection(
      readRepositoryFile("docs/API.md"),
      "## Runtime schemas",
    );
    const schemas = [
      ...new Set(indexSource.match(/[a-z][A-Za-z0-9]+Schema/g) ?? []),
    ].sort();

    expect(schemas).not.toHaveLength(0);

    for (const schema of schemas) {
      expect(schemaReference).toContain(`\`${schema}\``);
    }
  });

  it("states coverage as a dated documentation audit, not API completeness", () => {
    const canonicalCoverage =
      "Implements all 63 operations found across Monobank's two documentation sites as last audited on 2026-08-20.";

    for (const guide of ["AGENTS.md", "README.md", "llms.txt"]) {
      const contents = readRepositoryFile(guide);
      const normalizedContents = normalizeWhitespace(contents);

      expect(normalizedContents).toContain(canonicalCoverage);
      expect(normalizedContents).not.toContain(
        "Coverage of the Monobank API is partial",
      );
      expect(normalizedContents).not.toContain("Uncovered endpoints:");
    }
  });
});
