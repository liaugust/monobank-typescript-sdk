import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const rawArguments = process.argv.slice(2);
const argumentsWithoutSeparator =
  rawArguments[0] === "--" ? rawArguments.slice(1) : rawArguments;
const releaseTag =
  argumentsWithoutSeparator.length === 1
    ? argumentsWithoutSeparator[0]
    : undefined;
const expectedTag = `v${packageJson.version}`;

if (releaseTag !== expectedTag) {
  process.stderr.write(
    `Release tag "${String(releaseTag)}" must match package version "${packageJson.version}".`,
  );
  process.exitCode = 1;
}
