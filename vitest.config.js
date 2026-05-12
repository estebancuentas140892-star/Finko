import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    passWithNoTests: true,
    setupFiles: ['tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['modules/**/*.js'],
      exclude: ['modules/vitest.config.js'],
      thresholds: {
        lines: 80,
        functions: 80,
      },
    },
  },
});
