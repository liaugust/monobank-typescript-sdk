import { defineConfig, globalIgnores } from "eslint/config";
import importX from "eslint-plugin-import-x";
import jsdoc from "eslint-plugin-jsdoc";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

const publicApiFiles = [
  "src/acquiring/**/*.ts",
  "src/corporate/**/*.ts",
  "src/errors/*.ts",
  "src/personal/**/*.ts",
  "src/public/**/*.ts",
  "src/shared/*.ts",
  "src/transport/fetch-like.ts",
  "src/transport/retry-options.ts",
];
const sourceFiles = ["**/*.{js,mjs,cjs,ts,mts,cts}"];
const typedFiles = ["**/*.{ts,mts,cts}"];
const defaultExportFiles = [
  "eslint.config.mjs",
  "tsup.config.ts",
  "vitest.config.ts",
];

function rulesFrom(configurations) {
  return Object.assign({}, ...configurations.map(({ rules }) => rules));
}

export default defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
  },
  {
    files: typedFiles,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      ...rulesFrom(tseslint.configs.strictTypeChecked),
      ...rulesFrom(tseslint.configs.stylisticTypeChecked),
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          minimumDescriptionLength: 10,
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
      "@typescript-eslint/consistent-type-exports": [
        "error",
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "separate-type-imports", prefer: "type-imports" },
      ],
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        {
          allowDefaultCaseForExhaustiveSwitch: false,
          considerDefaultExhaustiveForUnions: false,
          requireDefaultForNonUnion: true,
        },
      ],
    },
  },
  {
    files: sourceFiles,
    plugins: { "import-x": importX, "simple-import-sort": simpleImportSort },
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
      "import-x/no-default-export": "error",
      "no-console": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-nested-ternary": "error",
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Pass validated runtime configuration into the SDK instead.",
        },
      ],
      "no-script-url": "error",
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",
    },
  },
  {
    files: publicApiFiles,
    ignores: ["**/*.test.ts"],
    plugins: { jsdoc },
    rules: {
      ...jsdoc.configs["flat/recommended-typescript-error"].rules,
      "jsdoc/informative-docs": "error",
      "jsdoc/require-description": "error",
      "jsdoc/require-jsdoc": [
        "error",
        {
          contexts: [
            "VariableDeclaration",
            "TSInterfaceDeclaration",
            "TSTypeAliasDeclaration",
            "TSMethodSignature",
            "TSPropertySignature",
            "MethodDefinition:not([accessibility='private']):not([accessibility='protected'])",
            "PropertyDefinition:not([accessibility='private']):not([accessibility='protected'])",
          ],
          publicOnly: {
            ancestorsOnly: true,
            cjs: false,
            esm: true,
            window: false,
          },
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            ClassExpression: true,
            FunctionDeclaration: true,
            FunctionExpression: true,
            MethodDefinition: false,
          },
        },
      ],
      "jsdoc/require-param-description": "error",
      "jsdoc/require-returns-description": "error",
    },
  },
  { files: defaultExportFiles, rules: { "import-x/no-default-export": "off" } },
  globalIgnores([
    ".husky/**",
    ".tmp/**",
    "coverage/**",
    "dist/**",
    "node_modules/**",
  ]),
]);
