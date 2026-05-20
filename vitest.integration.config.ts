import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [],
    include: ["src/__tests__/integration/**/*.test.ts"],
    exclude: [
      "node_modules/",
      "src/__tests__/e2e/",
      "src/__tests__/utils/",
      "src/__tests__/__mocks__/",
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
