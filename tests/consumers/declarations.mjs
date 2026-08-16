import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import ts from "typescript";

const declarationText = await readFile(
  new URL("../../dist/index.d.ts", import.meta.url),
  "utf8",
);
const sourceFile = ts.createSourceFile(
  "index.d.ts",
  declarationText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const hasJSDoc = (node) => Array.isArray(node.jsDoc) && node.jsDoc.length > 0;

function findClass(name) {
  let result;

  function visit(node) {
    if (ts.isClassDeclaration(node) && node.name?.text === name) {
      result = node;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  assert.ok(result, `${name} declaration is missing`);
  return result;
}

function findClassMember(classNode, name) {
  const result = classNode.members.find((member) => {
    if (name === "constructor") {
      return ts.isConstructorDeclaration(member);
    }

    return (
      ts.isMethodDeclaration(member) && member.name.getText(sourceFile) === name
    );
  });

  assert.ok(result, `${classNode.name.text}.${name} declaration is missing`);
  return result;
}

for (const errorClassName of [
  "MonobankApiError",
  "MonobankNetworkError",
  "MonobankResponseValidationError",
  "MonobankValidationError",
]) {
  assert.ok(
    hasJSDoc(findClass(errorClassName)),
    `${errorClassName} JSDoc is missing`,
  );
}

const clientClass = findClass("MonobankPersonalClient");
assert.ok(hasJSDoc(clientClass), "MonobankPersonalClient JSDoc is missing");

for (const memberName of [
  "constructor",
  "getBankSync",
  "getCurrencyRates",
  "getClientInfo",
  "getStatements",
  "setWebhook",
]) {
  assert.ok(
    hasJSDoc(findClassMember(clientClass, memberName)),
    `MonobankPersonalClient.${memberName} JSDoc is missing`,
  );
}
