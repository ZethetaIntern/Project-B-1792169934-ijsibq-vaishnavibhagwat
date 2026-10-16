/**
 * Shortcut to a later step: saves a complete, valid application as an encrypted
 * draft (and its files in the vault) with the app's own persistence code, then
 * reloads /apply and resumes it, exactly as a person returning to a saved
 * application would. Tests about Step 6, 7 or 8 then start there in a second
 * instead of re-filling every earlier step; the full journeys still cover those.
 *
 * Cypress serves specs from the app's origin, so LocalStorage and IndexedDB here
 * are the ones the app reads.
 */
/* eslint-disable import-x/extensions, import-x/no-unresolved -- TypeScript sources,
   compiled by Cypress's bundler; the JS lint resolver only looks for .js files */
import { createScenario } from '../../src/test/fixtures';
import { putFile, resetVaultConnection } from '../../src/utils/documentVault';
import { saveDraft } from '../../src/utils/draftStorage';
/* eslint-enable import-x/extensions, import-x/no-unresolved */

/** A real 1×1 PNG, so seeded photos and signatures render as images. */
const PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const SIGNATURE = `data:image/png;base64,${PIXEL_PNG}`;

function seededBlob(mimeType) {
  if (mimeType.startsWith('image/')) {
    return new Blob([Uint8Array.from(atob(PIXEL_PNG), (char) => char.charCodeAt(0))], { type: 'image/png' });
  }
  return new Blob(['%PDF-1.7\n% seeded by Cypress\n'], { type: mimeType });
}

/**
 * cy.resumeAt(stepId, { loanType, employment, edit })
 *   stepId      the step to open, e.g. 'coApplicant'
 *   loanType    'personal' (default), 'home' or 'business'
 *   employment  'salaried' (default), 'selfEmployed' or 'businessOwner'
 *   edit        (data) => void, to blank or change answers before saving
 */
Cypress.Commands.add('resumeAt', (stepId, { loanType = 'personal', employment = 'salaried', edit } = {}) => {
  const data = createScenario(loanType, employment);
  data.documents.signature = SIGNATURE;
  data.documents.signatureMethod = 'type';
  if (data.coApplicant.signature) data.coApplicant.signature = SIGNATURE;
  if (edit) edit(data);

  cy.window({ log: false }).then(async () => {
    const files = [...Object.values(data.documents.files).flat(), ...data.address.addressProof];
    await Promise.all(files.map((file) => putFile(file.id, seededBlob(file.mimeType))));
    resetVaultConnection(); // never hold the vault open while the app uses it
    await saveDraft({ data, currentStepId: stepId }, 'cypress-seed');
  });
  cy.visit('/apply');
  cy.contains('button', 'Resume application').click();
  cy.waitForStep();
});
