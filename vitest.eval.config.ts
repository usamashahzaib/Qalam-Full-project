// Separate config for the writing evaluation harness.
//
// These are not unit tests. They are slow, some of them cost money, and they
// produce reports rather than a pass/fail signal, so they are kept out of
// `npm test` by using a `.eval.ts` suffix that the default config does not
// match.
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["scripts/eval/**/*.eval.ts"],
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "__tests__/mocks/server-only.ts"),
    },
  },
})
