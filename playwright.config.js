/**
 * playwright.config.js - E2E / smoke tests de Finko.
 *
 * Corre sobre Chromium headless. Inicia un servidor Python en el puerto
 * 8081 para no interferir con el servidor de desarrollo (8080).
 *
 * Uso:
 *   npm run test:e2e           → corre todos los tests E2E
 *   npm run test:e2e -- --ui   → modo interactivo con UI de Playwright
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  // 1 retry para tests de E2E con timing sensible (SW entre workers paralelos).
  // Los tests de lógica pura no deberían necesitarlo nunca.
  retries: 1,

  use: {
    baseURL: 'http://localhost:8081',
    // Iniciar cada test con localStorage limpio.
    storageState: undefined,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Inicia el servidor antes de correr los tests.
  webServer: {
    command: 'python -m http.server 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 15_000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'coverage/e2e-report', open: 'never' }],
  ],
});
