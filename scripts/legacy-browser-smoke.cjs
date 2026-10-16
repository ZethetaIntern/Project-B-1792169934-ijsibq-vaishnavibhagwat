/* eslint-disable no-console -- command-line report */
/**
 * Smoke journey on the oldest engines the brief supports. Playwright 1.10 ships
 * Chromium 90, Firefox 87 and WebKit 14.2 (Safari 14), so this runs the real
 * production build on them: styles, fonts, Step 1 → 2, encrypted draft save and
 * resume.
 *
 *   npm run build && npx vite preview --port 4173
 *   npm install --no-save playwright@1.10.0 && npx playwright install chromium firefox webkit
 *   node scripts/legacy-browser-smoke.cjs [screenshot-folder]
 */
// eslint-disable-next-line import-x/no-unresolved -- installed on demand (see above)
const { chromium, firefox, webkit } = require('playwright');
const os = require('os');
const path = require('path');

const BASE = 'http://localhost:4173';
const OUT = process.argv[2] || os.tmpdir();

function readStyles() {
  const style = (element, property) => getComputedStyle(element)[property];
  const primary = [...document.querySelectorAll('button')]
    .find((button) => /Start your application/.test(button.textContent));
  return {
    body: style(document.body, 'backgroundColor'),
    h1Size: style(document.querySelector('h1'), 'fontSize'),
    buttonBg: style(primary, 'backgroundColor'),
    fonts: [...document.fonts]
      .filter((face) => /Inter/.test(face.family) && face.status === 'loaded')
      .map((face) => `${face.family} ${face.weight}`),
  };
}

async function run(name, type) {
  const browser = await type.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  const result = { name, version: browser.version(), checks: {} };
  try {
    await page.goto(`${BASE}/`);
    await page.waitForSelector('[data-testid="emi-calculator"]', { timeout: 20000 });
    await page.waitForTimeout(1500);
    result.checks.styles = await page.evaluate(readStyles);
    await page.screenshot({ path: path.join(OUT, `legacy-${name}-landing.png`) });

    await page.click('text=Start your application');
    await page.waitForSelector('[data-step-ready]', { timeout: 20000 });
    await page.click('label:has-text("Personal Loan")');
    await page.fill('[name="loanAmount"]', '300000');
    await page.press('[name="loanAmount"]', 'Tab');
    await page.selectOption('[name="tenureMonths"]', '36');
    await page.selectOption('[name="purpose"]', 'medical');
    await page.click('button[type=submit][form=wizard-step-form]');
    await page.waitForSelector('h1:has-text("About you")', { timeout: 15000 });
    await page.waitForTimeout(1500);
    result.checks.reachedStep2 = true;
    result.checks.draftFormat = await page.evaluate(
      () => (localStorage.getItem('lendswift_draft_personal') || '').split('.')[0],
    );

    // Reload and resume the encrypted draft.
    await page.goto(`${BASE}/apply?step=loan`);
    await page.waitForSelector('[data-step-ready]', { timeout: 20000 });
    const resume = await page.$('text=Resume application');
    if (resume) await resume.click();
    await page.waitForSelector('h1:has-text("About you")', { timeout: 15000 }).catch(() => {});
    result.checks.resumed = Boolean(await page.$('h1:has-text("About you")'));
  } catch (error) {
    [result.error] = error.message.split('\n');
  }
  result.errors = errors.slice(0, 5);
  await browser.close();
  return result;
}

const engines = [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]];
engines
  .reduce((previous, [name, type]) => previous
    .then(() => run(name, type))
    .then((result) => console.log(JSON.stringify(result))), Promise.resolve())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
