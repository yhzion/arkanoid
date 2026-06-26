/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  test: {
    // Unit tests live under tests/unit; Playwright owns tests/*.spec.ts
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
