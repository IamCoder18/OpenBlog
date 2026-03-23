import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/__tests__/**/*.test.{ts,tsx}",
      "**/?(*.)+(spec|test).{ts,tsx}",
    ],
    exclude: [
      "node_modules/",
      ".kilo/",
      "src/__tests__/e2e/",
      "src/__tests__/utils/",
      "src/__tests__/__mocks__/",
      "src/__tests__/integration/",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/__tests__/",
        "**/*.d.ts",
        "**/*.stories.{js,jsx,ts,tsx}",
      ],
    },
    execArgv: ["--no-webstorage"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
