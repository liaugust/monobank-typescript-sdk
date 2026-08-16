import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const temporaryRoot = join(repositoryRoot, ".tmp", "packed-package");
const archiveDirectory = join(temporaryRoot, "archive");
const extractedDirectory = join(temporaryRoot, "extracted");
const consumerDirectory = join(temporaryRoot, "consumer");

rmSync(temporaryRoot, { force: true, recursive: true });
mkdirSync(archiveDirectory, { recursive: true });
mkdirSync(extractedDirectory, { recursive: true });

const packResult = JSON.parse(
  execFileSync(
    "env",
    [
      "-u",
      "npm_config_store_dir",
      "npm",
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      archiveDirectory,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  ),
);
const packedPackage = packResult[0];

assert.ok(packedPackage);
assert.equal(packedPackage.name, "@liaugust/monobank-sdk");
assert.equal(packedPackage.version, "0.1.0");

const archivePath = join(archiveDirectory, packedPackage.filename);
execFileSync("tar", ["-xzf", archivePath, "-C", extractedDirectory]);

const extractedPackage = join(extractedDirectory, "package");
const extractedManifest = JSON.parse(
  readFileSync(join(extractedPackage, "package.json"), "utf8"),
);

for (const packageGuide of ["AGENTS.md", "docs/API.md", "llms.txt"]) {
  assert.equal(
    existsSync(join(extractedPackage, packageGuide)),
    true,
    `${packageGuide} must be available in the packed SDK`,
  );
}

for (const dependency of Object.keys(extractedManifest.dependencies ?? {})) {
  const dependencyTarget = realpathSync(
    join(repositoryRoot, "node_modules", dependency),
  );
  const dependencyLink = join(extractedPackage, "node_modules", dependency);

  mkdirSync(dirname(dependencyLink), { recursive: true });
  symlinkSync(dependencyTarget, dependencyLink, "junction");
}

const installedPackage = join(
  consumerDirectory,
  "node_modules",
  "@liaugust",
  "monobank-sdk",
);
mkdirSync(dirname(installedPackage), { recursive: true });
symlinkSync(extractedPackage, installedPackage, "junction");

writeFileSync(
  join(consumerDirectory, "esm.mjs"),
  'import { AccountType, MonobankAcquiringClient, MonobankPersonalClient, MonobankPublicClient, verifyAcquiringWebhookSignature } from "@liaugust/monobank-sdk";\n' +
    'const acquiring = new MonobankAcquiringClient({ token: "acquiring" });\n' +
    'const personal = new MonobankPersonalClient({ token: "personal" });\n' +
    "const publicApi = new MonobankPublicClient();\n" +
    'if (AccountType.Black !== "black" || !publicApi.bank || !publicApi.currency || !personal.client || !personal.statements || !personal.webhooks || !acquiring.invoices || !acquiring.merchant || !acquiring.qr || !acquiring.statements || !acquiring.submerchants || !acquiring.webhooks || typeof verifyAcquiringWebhookSignature !== "function") process.exitCode = 1;\n',
);
writeFileSync(
  join(consumerDirectory, "commonjs.cjs"),
  'const { CashbackType, MonobankAcquiringClient, MonobankPersonalClient, MonobankPublicClient, verifyAcquiringWebhookSignature } = require("@liaugust/monobank-sdk");\n' +
    'const acquiring = new MonobankAcquiringClient({ token: "acquiring" });\n' +
    'const personal = new MonobankPersonalClient({ token: "personal" });\n' +
    "const publicApi = new MonobankPublicClient();\n" +
    'if (CashbackType.UAH !== "UAH" || !publicApi.bank || !publicApi.currency || !personal.client || !personal.statements || !personal.webhooks || !acquiring.invoices || !acquiring.merchant || !acquiring.qr || !acquiring.statements || !acquiring.submerchants || !acquiring.webhooks || typeof verifyAcquiringWebhookSignature !== "function") process.exitCode = 1;\n',
);

for (const consumer of ["esm.mjs", "commonjs.cjs"]) {
  const result = spawnSync(process.execPath, [consumer], {
    cwd: consumerDirectory,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
}
