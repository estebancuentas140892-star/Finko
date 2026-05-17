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
      // Solo medir la capa de lógica pura (pure JS sin DOM).
      // Los view.js / index.js / ui/ / infra DOM-bound se testean
      // mediante smoke tests manuales o tests E2E, no con Vitest.
      include: ['modules/**/*.js'],
      exclude: [
        // Capa DOM: requiere browser real / E2E
        'modules/**/view.js',
        'modules/**/index.js',
        'modules/ui/**',
        'modules/infra/render.js',
        'modules/infra/router.js',
        'modules/infra/a11y.js',
        // Artefactos
        'modules/vitest.config.js',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
      },
    },
  },
});
