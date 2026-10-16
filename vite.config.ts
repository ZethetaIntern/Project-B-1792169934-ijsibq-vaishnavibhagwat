/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Oldest browsers the brief supports (B4). Tailwind runs through postcss.config.js. */
const BROWSER_TARGETS = ['chrome90', 'edge90', 'firefox88', 'safari14'];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: BROWSER_TARGETS,
    cssTarget: BROWSER_TARGETS,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    // Integration tests load code-split steps; give them room on slower machines and
    // under coverage instrumentation, and avoid starving workers on small CPUs.
    testTimeout: 15_000,
    maxWorkers: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.d.ts'],
    },
  },
});
