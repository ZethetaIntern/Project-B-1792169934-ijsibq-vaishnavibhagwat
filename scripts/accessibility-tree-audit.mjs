/* eslint-disable no-console -- command-line report */
/**
 * Reads the accessibility tree a screen reader gets (Chrome's, via Puppeteer) on
 * the landing page, the demo launcher, the resume prompt and every step, Step 1's
 * error state included, and checks what NVDA, VoiceOver and TalkBack rely on:
 *
 *   - one <main>, a banner, and one level-1 heading with no skipped levels
 *   - every control and image has an accessible name
 *   - every invalid field has a description (its error message)
 *   - wizard pages carry a polite live region for step and save announcements
 *
 * Prints a summary per page and writes each page's tree to the report folder.
 *
 *   npm run build && npx vite preview --port 4173    (terminal 1)
 *   npx vite --port 5173                              (terminal 2)
 *   npm install --no-save puppeteer-core
 *   node scripts/accessibility-tree-audit.mjs [report-folder]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// eslint-disable-next-line import-x/no-unresolved -- installed on demand (see above)
import puppeteer from 'puppeteer-core';
import {
  BASE, CHROME, LATER_STEPS, openFreshApplication, openSeededStep, pause,
  // eslint-disable-next-line import-x/extensions -- Node needs the extension in ES modules
} from './seeded-steps.mjs';

const OUT = process.argv[2] || os.tmpdir();
const CONTROL_ROLES = new Set([
  'button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'slider',
  'spinbutton', 'switch', 'tab', 'menuitem', 'option', 'listbox',
]);
const LANDMARK_ROLES = new Set(['banner', 'main', 'navigation', 'contentinfo', 'complementary', 'region', 'form']);

const flatten = (node) => (node ? [node, ...(node.children ?? []).flatMap(flatten)] : []);

const isInvalid = (node) => Boolean(node.invalid) && node.invalid !== 'false';

/** Indented `role "name" states` lines, like a screen reader's element list. */
const outline = (node, depth = 0) => {
  if (!node) return [];
  const states = [
    node.name && `"${node.name}"`,
    node.level && `level=${node.level}`,
    node.required && 'required',
    isInvalid(node) && 'invalid',
    node.checked !== undefined && `checked=${node.checked}`,
    node.expanded !== undefined && `expanded=${node.expanded}`,
  ].filter(Boolean);
  return [
    `${'  '.repeat(depth)}${[node.role, ...states].join(' ')}`,
    ...(node.children ?? []).flatMap((child) => outline(child, depth + 1)),
  ];
};

const results = [];

async function audit(page, name, { wizard = false, root } = {}) {
  const rootHandle = root ? await page.$(root) : null;
  const tree = await page.accessibility.snapshot({
    interestingOnly: true, root: rootHandle ?? undefined,
  });
  const nodes = flatten(tree);
  const roles = (role) => nodes.filter((node) => node.role === role);
  const headings = roles('heading').map((node) => node.level);
  const skipped = headings.some((level, index) => index > 0 && level > headings[index - 1] + 1);
  const liveRegions = await page.$$eval(
    '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]',
    (elements) => elements.map((element) => element.getAttribute('aria-live') ?? element.getAttribute('role')),
  );
  const invalid = nodes.filter(isInvalid);

  const problems = [
    !root && roles('main').length !== 1 && `${roles('main').length} main landmarks`,
    !root && roles('banner').length < 1 && 'no banner',
    !root && headings.filter((level) => level === 1).length !== 1 && `${headings.filter((level) => level === 1).length} level-1 headings`,
    skipped && `heading levels skip (${headings.join(' ')})`,
    ...nodes.filter((node) => CONTROL_ROLES.has(node.role) && !node.name?.trim())
      .map((node) => `unnamed ${node.role}`),
    ...nodes.filter((node) => ['image', 'img'].includes(node.role) && !node.name?.trim())
      .map(() => 'unnamed image'),
    ...invalid.filter((node) => !node.description?.trim())
      .map((node) => `invalid ${node.role} "${node.name}" has no error description`),
    wizard && !liveRegions.includes('polite') && 'no polite live region',
  ].filter(Boolean);

  results.push({
    name,
    landmarks: nodes.filter((node) => LANDMARK_ROLES.has(node.role)).length,
    headings: headings.length,
    controls: nodes.filter((node) => CONTROL_ROLES.has(node.role)).length,
    required: nodes.filter((node) => node.required).length,
    invalid: invalid.length,
    live: liveRegions.length,
    problems,
  });
  const file = path.join(OUT, `a11y-tree-${results.length.toString().padStart(2, '0')}.txt`);
  fs.writeFileSync(file, `${name}\n\n${outline(tree).join('\n')}\n`);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
await audit(page, 'Landing page');
const demo = await page.waitForSelector('xpath/.//button[contains(., "Try demo application")]');
await demo.click();
await page.waitForSelector('[role="dialog"]');
await pause(500);
await audit(page, 'Demo launcher (dialog)', { root: '[role="dialog"]' });

await openFreshApplication(page);
await audit(page, 'Step 1 · Choose your loan', { wizard: true });
await page.click('button[type="submit"][form="wizard-step-form"]');
await pause(800);
await audit(page, 'Step 1 · after Continue with nothing filled', { wizard: true });

await LATER_STEPS.reduce((previous, step, index) => previous.then(async () => {
  await openSeededStep(page, step);
  const heading = await page.$eval('h1', (h1) => h1.textContent);
  await audit(page, `Step ${index + 2} · ${heading}`, { wizard: true });
}), Promise.resolve());

await browser.close();

console.log('| Page | Landmarks | Headings | Controls | Required | Invalid | Live regions | Problems |');
console.log('|---|---|---|---|---|---|---|---|');
results.forEach((result) => console.log(`| ${result.name} | ${result.landmarks} | ${result.headings} | ${result.controls} | ${result.required} | ${result.invalid} | ${result.live} | ${result.problems.join('; ') || 'none'} |`));
console.log(`\nTrees: ${OUT}`);
process.exitCode = results.some((result) => result.problems.length) ? 1 : 0;
