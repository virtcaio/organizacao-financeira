import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Convenção: *.test.ts = unit (vitest), *.spec.ts = E2E (playwright).
    include: ["lib/**/*.test.ts", "types/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Permite importar módulos marcados "server-only" nos testes.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
