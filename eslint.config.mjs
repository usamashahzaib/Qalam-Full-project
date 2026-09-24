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
    ".claude/worktrees/**",
    ".playwright-mcp/**",
    "output/**",
    "outputs/**",
    "test-results/**",
    "playwright-report/**",
    // Local tool scratch folders. .gstack is not readable by every OS user,
    // and scanning it crashed `eslint .` outright.
    ".gstack/**",
    ".codex/**",
    ".codex-qa/**",
    ".codex-temp/**",
    ".resume-qa/**",
    ".fallow/**",
    ".tmp/**",
    ".vercel/**",
  ]),
]);

export default eslintConfig;
