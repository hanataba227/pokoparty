import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    include: [
      "src/lib/__tests__/**/*.test.ts",
      "src/app/__tests__/**/*.test.ts",
      "src/app/__tests__/**/*.test.tsx",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
