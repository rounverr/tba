import { defineConfig } from "vitest/config";
export default defineConfig(({ mode }) => ({
  test: {
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
    env:
      mode === "tba-postgresql" || mode === "tba-sqlite"
        ? { TBA_TEST_ENGINE: mode.slice(4) }
        : {},
  },
}));
