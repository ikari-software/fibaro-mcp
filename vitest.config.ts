import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'dist/**', 'node_modules/**'],
      reporter: ['text', 'lcov'],
    } as any,
  },
});
