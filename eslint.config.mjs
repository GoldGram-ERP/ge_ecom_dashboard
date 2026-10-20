import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Library components copied in by the shadcn CLI (animate-ui and shadcn/ui): their code is upstream's.
    "src/components/animate-ui/**",
    "src/components/ui/**",
    "src/hooks/**",
    "src/lib/get-strict-context.tsx",
  ]),
]);

export default eslintConfig;
