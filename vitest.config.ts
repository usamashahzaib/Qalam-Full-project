import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000,
    // The suite guards the whole product, including surfaces paused in lib/frozen-surfaces.ts,
    // so they still work when they come back. __tests__/frozen-surfaces.test.ts covers the pause.
    env: { NEXT_PUBLIC_UNFROZEN_SURFACES: "all" },
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.claude/worktrees/**",
      "**/tests/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // The real "server-only" module throws outside an RSC bundle, killing
      // any test that imports lib/server/* code. Stub it for unit tests.
      "server-only": path.resolve(__dirname, "__tests__/mocks/server-only.ts"),
    },
  },
})
