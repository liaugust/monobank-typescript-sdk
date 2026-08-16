import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: {
    compilerOptions: {
      ignoreDeprecations: "6.0",
    },
  },
  entry: ["src/index.ts"],
  external: ["zod"],
  format: ["esm", "cjs"],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
  sourcemap: true,
  splitting: false,
  target: "es2022",
  treeshake: true,
});
