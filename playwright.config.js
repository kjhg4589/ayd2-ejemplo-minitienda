const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  // En CI: reintenta pruebas inestables y genera reporte HTML (se sube como artefacto si falla)
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Playwright levanta el servidor con una BD limpia antes de las pruebas
  webServer: {
    command: 'node src/server.js',
    url: 'http://localhost:3100/api/salud',
    env: { PORT: '3100', DB_PATH: ':memory:', SEED: '1' },
    reuseExistingServer: false,
  },
});
