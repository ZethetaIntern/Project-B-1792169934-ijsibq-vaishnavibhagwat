/**
 * Custom commands for the LendSwift journeys. They drive the real UI the way a
 * person would: typing, choosing, verifying with on-screen codes and pressing
 * Continue. Nothing writes to the store directly.
 */

const STEP_FORM = '#wizard-step-form';
const CONTINUE = 'button[type="submit"][form="wizard-step-form"]';

const field = (name) => cy.get(`${STEP_FORM} [name="${name}"]`);

/** Opens the application with nothing stored: no drafts, files or demo. */
Cypress.Commands.add('startApplication', (path = '/apply') => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.clear();
      win.sessionStorage.clear();
      win.indexedDB.deleteDatabase('lendswift_vault');
    },
  });
  cy.waitForStep();
});

/** Waits until the open step has mounted (and optionally checks its heading). */
Cypress.Commands.add('waitForStep', (title) => {
  cy.get('[data-step-ready]', { timeout: 10000 }).should('exist');
  if (title) cy.contains('h1', title).should('be.visible');
});

/** Presses Continue (or "Review application"), exactly like the user. */
Cypress.Commands.add('continueStep', () => {
  cy.get(CONTINUE).should('be.enabled').click();
});

/** Clears a field and types a value, then leaves it so on-blur rules run. */
Cypress.Commands.add('typeInto', (name, value) => {
  field(name).clear().type(value).blur();
});

/** Picks an option in the custom dropdown (button + listbox) by its text. */
Cypress.Commands.add('chooseOption', (name, optionText) => {
  cy.get(`${STEP_FORM} button[name="${name}"]`).click();
  cy.contains('[role="option"]', optionText).click();
});

/** Signs with the keyboard-accessible "Type" mode inside a signature group. */
Cypress.Commands.add('typeSignature', (groupLabel, name) => {
  cy.contains('[role="group"]', groupLabel).within(() => {
    cy.contains('button', 'Type').click();
    cy.get('input').first().clear().type(name);
    cy.contains('button', 'Use this signature').click();
  });
});

/** Draws a stroke on a signature pad with pointer events. */
Cypress.Commands.add('drawSignature', (groupLabel) => {
  cy.contains('[role="group"]', groupLabel).within(() => {
    cy.get('[data-testid="signature-canvas"]').scrollIntoView().then(($canvas) => {
      const rect = $canvas[0].getBoundingClientRect();
      // react-signature-canvas (signature_pad 2) listens for mouse and touch events and
      // only draws while the left button (`which: 1`) is held.
      const point = (x, y, buttons = 1) => ({
        eventConstructor: 'MouseEvent', clientX: rect.left + x, clientY: rect.top + y, which: 1, button: 0, buttons,
      });
      cy.wrap($canvas)
        .trigger('mousedown', point(30, 60))
        .trigger('mousemove', point(90, 30))
        .trigger('mousemove', point(160, 90))
        .trigger('mousemove', point(240, 40))
        .trigger('mouseup', point(240, 40, 0));
    });
  });
});

/** Uploads a fixture through a document's real uploader. */
Cypress.Commands.add('uploadDocument', (documentId, fixture) => {
  cy.get(`[data-testid="upload-input-${documentId}"]`).selectFile(`cypress/fixtures/${fixture}`, { force: true });
});

/** Runs axe on the main content with WCAG 2.1 A/AA rules. */
Cypress.Commands.add('checkPageA11y', (context = '#main-content') => {
  cy.injectAxe();
  cy.checkA11y(context, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }, (violations) => {
    violations.forEach((violation) => {
      Cypress.log({ name: 'a11y', message: `${violation.id}: ${violation.help} (${violation.nodes.length})` });
    });
  });
});

/** Verifies the mobile number with the one-time code shown on screen (simulated). */
Cypress.Commands.add('verifyMobileWithOtp', () => {
  cy.get('button[aria-label="Verify mobile number"]').click();
  cy.get('[data-testid="demo-otp"]').invoke('text').then((code) => {
    cy.get('input[autocomplete="one-time-code"]').type(code.trim());
  });
  cy.contains('button', 'Verify code').click();
  // The button reads "Checking…" while the (simulated) check runs; the code panel
  // only disappears once the number is verified.
  cy.get('input[autocomplete="one-time-code"]', { timeout: 6000 }).should('not.exist');
  cy.get('[name="mobile"]').should('not.have.attr', 'aria-invalid', 'true');
});

// ---- Step fillers (cypress/fixtures/valid-*.json) ----

Cypress.Commands.add('fillStep1', (loan) => {
  cy.waitForStep('Choose your loan');
  cy.contains('label', loan.type).click();
  cy.typeInto('loanAmount', loan.amount);
  field('tenureMonths').select(loan.tenureMonths);
  field('purpose').select(loan.purpose);
});

Cypress.Commands.add('fillStep2', (person) => {
  cy.waitForStep('About you');
  cy.typeInto('fullName', person.fullName);
  field('dateOfBirth').type(person.dateOfBirth).blur();
  field('maritalStatus').select(person.maritalStatus);
  cy.get(`${STEP_FORM} input[name="gender"][value="${person.gender.toLowerCase()}"]`).check({ force: true });
  cy.typeInto('fatherName', person.fatherName);
  cy.typeInto('motherName', person.motherName);
  cy.typeInto('mobile', person.mobile);
  cy.verifyMobileWithOtp();
  cy.typeInto('email', person.email);
});

Cypress.Commands.add('fillStep3', (kyc) => {
  cy.waitForStep('Verify your identity');
  cy.typeInto('pan', kyc.pan);
  cy.contains('[role="status"]', 'PAN verified.', { timeout: 6000 });
  cy.typeInto('aadhaar', kyc.aadhaar);
  cy.contains('[role="status"]', 'Aadhaar verified.', { timeout: 6000 });
  field('aadhaarConsent').check({ force: true });
  if (kyc.passport) cy.typeInto('passportNumber', kyc.passport);
});

Cypress.Commands.add('fillStep4', (address) => {
  cy.waitForStep('Where you live');
  cy.typeInto('current.line1', address.line1);
  cy.typeInto('current.pinCode', address.pinCode);
  field('current.city').should('have.value', address.city);
  field('current.state').should('have.value', address.state);
  field('residenceType').select(address.residenceType);
  if (address.rent) cy.typeInto('monthlyRent', address.rent);
  cy.typeInto('yearsAtCurrentAddress', address.years);
});

Cypress.Commands.add('fillStep5', (job) => {
  cy.waitForStep('Work and income');
  cy.contains('label', job.type).click();
  if (job.type === 'Salaried') {
    cy.typeInto('companyName', job.companyName);
    cy.typeInto('designation', job.designation);
    cy.typeInto('monthlySalary', job.monthlySalary);
  } else {
    cy.typeInto('businessName', job.businessName);
    cy.chooseOption('businessType', job.businessType);
    cy.typeInto('annualTurnover', job.annualTurnover);
    cy.typeInto('yearsInBusiness', job.yearsInBusiness);
    cy.typeInto('monthlyIncome', job.monthlyIncome);
    if (job.gstNumber) cy.typeInto('gstNumber', job.gstNumber);
    cy.typeInto('officeAddress.line1', job.officeLine1);
    cy.typeInto('officeAddress.pinCode', job.officePinCode);
    field('officeAddress.city').should('not.have.value', '');
  }
  cy.typeInto('yearsOfExperience', job.yearsOfExperience);
});

Cypress.Commands.add('fillStep6', (coApplicant) => {
  cy.waitForStep('Add a co-applicant');
  cy.typeInto('fullName', coApplicant.fullName);
  field('relationship').select(coApplicant.relationship);
  cy.typeInto('pan', coApplicant.pan);
  cy.contains('[role="status"]', "Co-applicant's PAN verified.", { timeout: 6000 });
  cy.typeInto('monthlyIncome', coApplicant.monthlyIncome);
  field('consent').check({ force: true });
  cy.typeSignature("Co-applicant's signature", coApplicant.fullName);
});

Cypress.Commands.add('fillStep7', (documents, signerName) => {
  cy.waitForStep('Documents and signature');
  Object.entries(documents).forEach(([id, fixture]) => cy.uploadDocument(id, fixture));
  cy.get('[data-testid="uploaded-file"]', { timeout: 15000 })
    .should('have.length.at.least', Object.keys(documents).length);
  cy.typeSignature('Your signature', signerName);
  cy.contains('required items ready', { timeout: 10000 })
    .should(($text) => {
      const [ready, total] = $text.text().match(/\d+/g).map(Number);
      expect(ready).to.equal(total);
    });
});

/** Ticks the checkbox a label belongs to (avoids clicking links inside the label). */
Cypress.Commands.add('tickConsent', (labelText) => {
  cy.contains('label', labelText).invoke('attr', 'for').then((id) => {
    cy.get(`#${CSS.escape(id)}`).check({ force: true });
  });
});

Cypress.Commands.add('fillStep8', () => {
  cy.waitForStep('Review and submit');
  [/true, complete and accurate/, /get my credit report/, /I have read and agree/, /receive updates/]
    .forEach((label) => cy.tickConsent(label));
});

/** Fills Steps 1–6 (as applicable) and stops on the documents step. */
Cypress.Commands.add('reachDocumentsStep', (data) => {
  cy.fillStep1(data.loan);
  cy.continueStep();
  cy.fillStep2(data.personal);
  cy.continueStep();
  cy.fillStep3(data.kyc);
  cy.continueStep();
  cy.fillStep4(data.address);
  cy.continueStep();
  cy.fillStep5(data.employment);
  cy.continueStep();
  if (data.coApplicant) {
    cy.fillStep6(data.coApplicant);
    cy.continueStep();
  }
  cy.waitForStep('Documents and signature');
});

/** Walks a complete application from Step 1 to the review page. */
Cypress.Commands.add('completeApplication', (data) => {
  cy.fillStep1(data.loan);
  cy.continueStep();
  cy.fillStep2(data.personal);
  cy.continueStep();
  cy.fillStep3(data.kyc);
  cy.continueStep();
  cy.fillStep4(data.address);
  cy.continueStep();
  cy.fillStep5(data.employment);
  cy.continueStep();
  if (data.coApplicant) {
    cy.fillStep6(data.coApplicant);
    cy.continueStep();
  }
  cy.fillStep7(data.documents, data.personal.fullName);
  cy.continueStep();
  cy.waitForStep('Review and submit');
});
