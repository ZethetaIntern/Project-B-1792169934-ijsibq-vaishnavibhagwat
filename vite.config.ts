/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** Oldest browsers the brief supports (B4). Tailwind runs through postcss.config.js. */
const BROWSER_TARGETS = ['chrome90', 'edge90', 'firefox88', 'safari14'];

/** Code-split modules each page needs before it can show anything (see src/routes.ts). */
const ROUTE_MODULES = {
  apply: /\/(ApplicationWorkspace|Step1LoanType)\.tsx$/,
  landing: /\/LandingRoute\.tsx$/,
};

/**
 * The main bundle only discovers the opened page's chunks once it has downloaded
 * and run. This adds a small inline script that preloads them, and everything they
 * import, in parallel with the main bundle: the workspace and Step 1 on /apply,
 * the landing page everywhere else (the same split as `routeFromPath`).
 */
function preloadRouteChunks(): Plugin {
  return {
    name: 'lendswift:preload-route-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        if (!bundle) return html;
        const chunksFor = (pattern: RegExp) => {
          const files = new Set<string>();
          const visit = (fileName: string) => {
            const chunk = bundle[fileName];
            if (files.has(fileName) || chunk?.type !== 'chunk') return;
            files.add(fileName);
            chunk.imports.forEach(visit);
          };
          Object.values(bundle).forEach((chunk) => {
            if (chunk.type === 'chunk' && pattern.test(chunk.facadeModuleId ?? '')) visit(chunk.fileName);
          });
          return [...files].map((file) => `/${file}`).filter((href) => !html.includes(href));
        };
        const script = `(function () {
  var apply = location.pathname.split('/').filter(Boolean).join('/') === 'apply';
  var hrefs = apply ? ${JSON.stringify(chunksFor(ROUTE_MODULES.apply))} : ${JSON.stringify(chunksFor(ROUTE_MODULES.landing))};
  hrefs.forEach(function (href) {
    var link = document.createElement('link');
    link.rel = 'modulepreload';
    link.crossOrigin = '';
    link.href = href;
    document.head.appendChild(link);
  });
})();`;
        return { html, tags: [{ tag: 'script', children: script, injectTo: 'head' }] };
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadRouteChunks()],
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
