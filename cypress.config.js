import { defineConfig } from 'cypress';

/**
 * End-to-end tests run against the production build (`vite preview`), the closest
 * thing to what users get. `npm run test:e2e` builds, serves and runs everything.
 */
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 8000,
    video: false,
    screenshotOnRunFailure: true,
    retries: { runMode: 1, openMode: 0 },
  },
});
