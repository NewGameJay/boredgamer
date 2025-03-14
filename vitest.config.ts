import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/sdk/tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['src/sdk/tests/setup.ts'],
    css: false, // Disable CSS processing for SDK tests
  },
});
