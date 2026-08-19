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
      (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) &&
      member.name.getText(sourceFile) === name
    );
  });

  assert.ok(result, `${classNode.name.text}.${name} declaration is missing`);
  return result;
}

function findFunction(name) {
  let result;

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      result = node;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  assert.ok(result, `${name} declaration is missing`);
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

for (const memberName of ["constructor", "client", "statements", "webhooks"]) {
  assert.ok(
    hasJSDoc(findClassMember(clientClass, memberName)),
    `MonobankPersonalClient.${memberName} JSDoc is missing`,
  );
}

const publicClientClass = findClass("MonobankPublicClient");
assert.ok(hasJSDoc(publicClientClass), "MonobankPublicClient JSDoc is missing");

for (const memberName of ["constructor", "bank", "currency"]) {
  assert.ok(
    hasJSDoc(findClassMember(publicClientClass, memberName)),
    `MonobankPublicClient.${memberName} JSDoc is missing`,
  );
}

const acquiringClientClass = findClass("MonobankAcquiringClient");
assert.ok(
  hasJSDoc(acquiringClientClass),
  "MonobankAcquiringClient JSDoc is missing",
);

for (const memberName of [
  "constructor",
  "employees",
  "invoices",
  "merchant",
  "qr",
  "statements",
  "submerchants",
  "subscriptions",
  "wallet",
  "webhooks",
]) {
  assert.ok(
    hasJSDoc(findClassMember(acquiringClientClass, memberName)),
    `MonobankAcquiringClient.${memberName} JSDoc is missing`,
  );
}

const corporateClientClass = findClass("MonobankCorporateClient");
assert.ok(
  hasJSDoc(corporateClientClass),
  "MonobankCorporateClient JSDoc is missing",
);

for (const memberName of [
  "constructor",
  "access",
  "clients",
  "company",
  "documents",
]) {
  assert.ok(
    hasJSDoc(findClassMember(corporateClientClass, memberName)),
    `MonobankCorporateClient.${memberName} JSDoc is missing`,
  );
}

const resourceContracts = [
  ["MonobankPublicBank", ["constructor", "getSync"]],
  ["MonobankPublicCurrency", ["constructor", "getRates"]],
  ["MonobankPersonalClientInfo", ["constructor", "getInfo"]],
  ["MonobankPersonalStatements", ["constructor", "get"]],
  ["MonobankPersonalWebhooks", ["constructor", "set"]],
  ["MonobankAcquiringEmployees", ["constructor", "list"]],
  ["MonobankAcquiringQr", ["constructor", "getDetails", "list", "resetAmount"]],
  ["MonobankAcquiringWallet", ["constructor", "deleteCard", "list", "pay"]],
  ["MonobankAcquiringStatements", ["constructor", "get"]],
  ["MonobankAcquiringSubmerchants", ["constructor", "list"]],
  [
    "MonobankAcquiringSubscriptions",
    [
      "constructor",
      "create",
      "edit",
      "getPayments",
      "getStatus",
      "list",
      "remove",
    ],
  ],
  ["MonobankAcquiringWebhooks", ["constructor", "getPublicKey"]],
  ["MonobankCorporateAccess", ["constructor", "check", "request"]],
  ["MonobankCorporateClients", ["constructor", "getInfo", "getStatements"]],
  [
    "MonobankCorporateCompany",
    [
      "constructor",
      "getRegistrationStatus",
      "getSettings",
      "register",
      "setWebhook",
    ],
  ],
  [
    "MonobankCorporateDocuments",
    ["constructor", "cancelSigning", "getSigningStatus", "requestSigning"],
  ],
];

for (const [className, memberNames] of resourceContracts) {
  const resourceClass = findClass(className);
  assert.ok(hasJSDoc(resourceClass), `${className} JSDoc is missing`);

  for (const memberName of memberNames) {
    assert.ok(
      hasJSDoc(findClassMember(resourceClass, memberName)),
      `${className}.${memberName} JSDoc is missing`,
    );
  }
}

assert.ok(
  hasJSDoc(findFunction("verifyAcquiringWebhookSignature")),
  "verifyAcquiringWebhookSignature JSDoc is missing",
);

const merchantClass = findClass("MonobankAcquiringMerchant");
assert.ok(
  hasJSDoc(merchantClass),
  "MonobankAcquiringMerchant JSDoc is missing",
);

for (const memberName of ["constructor", "getDetails"]) {
  assert.ok(
    hasJSDoc(findClassMember(merchantClass, memberName)),
    `MonobankAcquiringMerchant.${memberName} JSDoc is missing`,
  );
}

const invoicesClass = findClass("MonobankAcquiringInvoices");
assert.ok(
  hasJSDoc(invoicesClass),
  "MonobankAcquiringInvoices JSDoc is missing",
);

for (const memberName of [
  "constructor",
  "cancel",
  "create",
  "finalize",
  "getFiscalChecks",
  "getReceipt",
  "getStatus",
  "payDirect",
  "remove",
  "syncPayment",
]) {
  assert.ok(
    hasJSDoc(findClassMember(invoicesClass, memberName)),
    `MonobankAcquiringInvoices.${memberName} JSDoc is missing`,
  );
}
