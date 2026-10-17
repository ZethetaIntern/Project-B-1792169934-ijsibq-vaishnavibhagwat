/**
 * Shared by the Puppeteer audit scripts: opens any step of the production build
 * (4173) with a complete application behind it, the way `cy.resumeAt` does. The
 * app's own fixture, vault and draft modules, served by the Vite dev server
 * (5173), save an encrypted draft into the production origin; the page then
 * resumes it like a returning applicant.
 */
export const BASE = 'http://localhost:4173';
export const DEV = 'http://localhost:5173';
export const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const LATER_STEPS = ['personal', 'kyc', 'address', 'employment', 'coApplicant', 'documents', 'review'];

export const pause = (ms) => new Promise((resolve) => {
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
  await saveDraft({ data, currentStepId: step }, 'script-seed');
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

/** Waits for the open step to mount, any dialog to close and its entrance to finish. */
export async function waitForStep(page) {
  await page.waitForSelector('[data-step-ready]', { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 10000 });
  await pause(800);
}

/** Opens /apply on Step 1 with nothing stored. */
export async function openFreshApplication(page) {
  await page.goto(`${BASE}/apply`);
  await page.evaluate(clearStorage);
  await page.reload();
  await waitForStep(page);
}

/**
 * Opens `step` of a complete Home Loan application (call on a page already at BASE).
 * Loads a bare /apply rather than reloading, because a `?step=` left in the URL by an
 * earlier step would win over the draft.
 */
export async function openSeededStep(page, step) {
  await page.evaluate(clearStorage);
  await page.evaluate(seedDraft, { dev: DEV, step });
  await page.goto(`${BASE}/apply`);
  const resume = await page.waitForSelector('xpath/.//button[contains(., "Resume application")]');
  await resume.click();
  await waitForStep(page);
}
