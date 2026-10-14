import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // The first run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
});
