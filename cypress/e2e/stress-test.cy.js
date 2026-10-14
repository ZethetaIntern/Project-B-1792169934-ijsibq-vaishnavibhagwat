const CONTINUE = 'button[type="submit"][form="wizard-step-form"]';

describe('Journey 14 — rapid navigation and hostile input', () => {
  let data;
  before(() => {
    cy.fixture('valid-personal-loan.json').then((fixture) => {
      data = fixture;
    });
  });

  beforeEach(() => cy.startApplication());

  it('survives 20 rapid Continue clicks on an empty step without moving on', () => {
    for (let click = 0; click < 20; click += 1) cy.get(CONTINUE).click({ force: true });
    cy.contains('h1', 'Choose your loan').should('be.visible');
    cy.contains('Choose the type of loan you need.').should('be.visible');
  });

  it('moves exactly one step for 5 rapid clicks on a valid step', () => {
    cy.fillStep1(data.loan);
    for (let click = 0; click < 5; click += 1) cy.get(CONTINUE).click({ force: true });
    cy.waitForStep('About you');
    cy.contains('Step 2 of 7').should('be.visible');
    cy.get('[name="fullName"]').should('have.value', '');
  });

  it('keeps answers through a back-and-forth loop, then a loan type change adds Step 6', () => {
    cy.fillStep1(data.loan);
    cy.continueStep();
    cy.waitForStep('About you');
    cy.typeInto('fullName', data.personal.fullName);

    for (let round = 0; round < 5; round += 1) {
      cy.get('button[aria-label="Back to previous step"]').click();
      cy.waitForStep('Choose your loan');
      cy.continueStep();
      cy.waitForStep('About you');
      cy.get('[name="fullName"]').should('have.value', data.personal.fullName);
    }

    cy.get('button[aria-label="Back to previous step"]').click();
    cy.contains('label', 'Home Loan').click();
    cy.typeInto('loanAmount', '4000000');
    cy.get('[name="tenureMonths"]').select('240');
    cy.get('[name="purpose"]').select('ready-property');
    cy.continueStep();
    cy.waitForStep('About you');
    cy.contains('Step 2 of 8').should('be.visible');
    cy.get('[name="fullName"]').should('have.value', data.personal.fullName);
  });

  it('caps over-long input and rejects unsupported characters with a clear message', () => {
    cy.fillStep1(data.loan);
    cy.continueStep();
    cy.waitForStep('About you');

    cy.get('[name="fullName"]').type('A'.repeat(120)).blur();
    cy.get('[name="fullName"]').invoke('val').its('length').should('be.at.most', 100);

    cy.typeInto('fullName', 'Meera 🙂 Iyer');
    cy.contains('Use only English letters, spaces and full stops in the full name').should('be.visible');
    cy.typeInto('fullName', '<script>alert(1)</script>');
    cy.contains('Use only English letters, spaces and full stops').should('be.visible');
    cy.on('window:alert', () => {
      throw new Error('Input was executed as script');
    });

    cy.typeInto('fullName', '  Meera   Iyer  ');
    cy.typeInto('fatherName', 'Suresh Iyer');
    cy.get('[name="fullName"]').should('not.have.attr', 'aria-invalid', 'true');
  });

  it('submits only once when Submit is double-clicked', () => {
    cy.completeApplication(data);
    cy.fillStep8();
    cy.get('[data-testid="submit-application"]').dblclick();
    cy.get('[data-testid="submission-success"]', { timeout: 10000 }).should('have.length', 1);
    cy.get('[data-testid="submission-reference"]').should('have.length', 1);
  });
});
