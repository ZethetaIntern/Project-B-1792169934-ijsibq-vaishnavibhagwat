/* eslint-disable no-console -- command-line report */
/**
 * Lighthouse accessibility on the landing page and every step of the production
 * build, Step 1's error state included. A Lighthouse user flow audits each page as
 * it is on screen (snapshot mode), so later steps are reached the way
 * `cy.resumeAt` does it: the app's own fixture, vault and draft modules, served by
 * the Vite dev server, save an encrypted draft into the production origin and the
 * page resumes it.
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

const FORM = process.argv[2] === 'desktop' ? 'desktop' : 'mobile';
const OUT = process.argv[3] || os.tmpdir();
const BASE = 'http://localhost:4173';
const DEV = 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LATER_STEPS = ['personal', 'kyc', 'address', 'employment', 'coApplicant', 'documents', 'review'];

const pause = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

/** Runs in the page: saves a complete Home Loan application, open at `step`. */
async function seedDraft({ dev, step }) {
  const { createScenario } = await import(`${dev}/src/test/fixtures.ts`);
  const { putFile, resetVaultConnection } = await import(`${dev}/src/utils/documentVault.ts`);
  const { saveDraft } = await import(`${dev}/src/utils/draftStorage.ts`);
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const blobFor = (mimeType) => (mimeType.startsWith('image/')
    ? new Blob([Uint8Array.from(atob(png), (char) => char.charCodeAt(0))], { type: 'image/png' })
    : new Blob(['%PDF-1.7\n% seeded\n'], { type: mimeType }));

  const data = createScenario('home', 'salaried');
  data.documents.signature = `data:image/png;base64,${png}`;
  data.documents.signatureMethod = 'type';
  if (data.coApplicant.signature) data.coApplicant.signature = data.documents.signature;
  const files = [...Object.values(data.documents.files).flat(), ...data.address.addressProof];
  await Promise.all(files.map((file) => putFile(file.id, blobFor(file.mimeType))));
  resetVaultConnection();
  await saveDraft({ data, currentStepId: step }, 'lighthouse-seed');
}

/** Runs in the page: forgets every draft, file and demo. */
async function clearStorage() {
  localStorage.clear();
  sessionStorage.clear();
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase('lendswift_vault');
    request.onsuccess = resolve;
    request.onerror = resolve;
    request.onblocked = resolve;
  });
}

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

async function waitForStep() {
  await page.waitForSelector('[data-step-ready]', { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 10000 });
  await pause(800); // let the step's entrance animation finish
}

await flow.navigate(`${BASE}/`, { name: 'Landing page' });

await page.goto(`${BASE}/apply`);
await page.evaluate(clearStorage);
await page.reload();
await waitForStep();
await flow.snapshot({ name: 'Step 1 · Choose your loan' });
await page.click('button[type="submit"][form="wizard-step-form"]');
await pause(800);
await flow.snapshot({ name: 'Step 1 · with errors' });

// One step after another: the flow records snapshots in order.
await LATER_STEPS.reduce((previous, step, index) => previous.then(async () => {
  await page.evaluate(clearStorage);
  await page.evaluate(seedDraft, { dev: DEV, step });
  await page.reload();
  const resume = await page.waitForSelector('xpath/.//button[contains(., "Resume application")]');
  await resume.click();
  await waitForStep();
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
