import { defineConfig } from 'vitest/config';

/**
 * Config dedicada del benchmark de rendimiento (PERF.0). Separada de
 * `vitest.config.js` para que `pnpm test` NO lo incluya: la medición es lenta
 * y no es un test de aserción de negocio. Se corre con `pnpm perf`.
 */
export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['scripts/perf/**/*.perf.js'],
    setupFiles: ['tests/setup.js'],
  },
});
