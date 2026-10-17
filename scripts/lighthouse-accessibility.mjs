/* eslint-disable no-console -- command-line report */
/**
 * Lighthouse accessibility on the landing page and every step of the production
 * build, Step 1's error state included. A Lighthouse user flow audits each page as
 * it is on screen (snapshot mode); later steps are opened from a seeded draft,
 * the way `cy.resumeAt` does it (see seeded-steps.mjs).
 *
 *   npm run build && npx vite preview --port 4173    (terminal 1)
 *   npx vite --port 5173                              (terminal 2)
 *   npm install --no-save lighthouse@12.8.2 puppeteer-core
 *   node scripts/lighthouse-accessibility.mjs [mobile|desktop] [report-folder]
 *
 * Uses the installed Chrome (set CHROME_PATH to override).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// eslint-disable-next-line import-x/no-unresolved -- installed on demand (see above)
import { startFlow, desktopConfig } from 'lighthouse';
// eslint-disable-next-line import-x/no-unresolved -- installed on demand (see above)
import puppeteer from 'puppeteer-core';
import {
  BASE, CHROME, LATER_STEPS, openFreshApplication, openSeededStep, pause,
  // eslint-disable-next-line import-x/extensions -- Node needs the extension in ES modules
} from './seeded-steps.mjs';

const FORM = process.argv[2] === 'desktop' ? 'desktop' : 'mobile';
const OUT = process.argv[3] || os.tmpdir();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport(FORM === 'desktop'
  ? { width: 1350, height: 940 }
  : {
    width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true,
  });

const config = FORM === 'desktop'
  ? { ...desktopConfig, settings: { ...desktopConfig.settings, onlyCategories: ['accessibility'] } }
  : { extends: 'lighthouse:default', settings: { onlyCategories: ['accessibility'] } };
const flow = await startFlow(page, { name: `LendSwift accessibility (${FORM})`, config });

await flow.navigate(`${BASE}/`, { name: 'Landing page' });

await openFreshApplication(page);
await flow.snapshot({ name: 'Step 1 · Choose your loan' });
await page.click('button[type="submit"][form="wizard-step-form"]');
await pause(800);
await flow.snapshot({ name: 'Step 1 · with errors' });

// One step after another: the flow records snapshots in order.
await LATER_STEPS.reduce((previous, step, index) => previous.then(async () => {
  await openSeededStep(page, step);
  const heading = await page.$eval('h1', (h1) => h1.textContent);
  await flow.snapshot({ name: `Step ${index + 2} · ${heading}` });
}), Promise.resolve());

const report = path.join(OUT, `lighthouse-accessibility-${FORM}.html`);
fs.writeFileSync(report, await flow.generateReport());
const { steps } = await flow.createFlowResult();
steps.forEach(({ name, lhr }) => {
  const failing = Object.values(lhr.audits)
    .filter((audit) => audit.scoreDisplayMode === 'binary' && audit.score === 0)
    .map((audit) => audit.id);
  const score = Math.round(lhr.categories.accessibility.score * 100);
  console.log(`${String(score).padStart(3)}  ${name}${failing.length ? `  failing: ${failing.join(', ')}` : ''}`);
});
console.log(`Report: ${report}`);
await browser.close();
