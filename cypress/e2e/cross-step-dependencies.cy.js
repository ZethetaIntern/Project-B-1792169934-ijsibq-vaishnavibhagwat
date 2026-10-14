const stepCount = () => cy.contains(/^Step \d+ of \d+$/).invoke('text')
  .then((text) => Number(text.split(' of ')[1]));

describe('Cross-step dependencies', () => {
  let data;
  before(() => {
    cy.fixture('valid-personal-loan.json').then((fixture) => {
      data = fixture;
    });
  });

  beforeEach(() => cy.startApplication());

  it('Journey 9 · Step 6 appears only above the threshold (₹5,00,000 hidden, ₹5,00,001 shown)', () => {
    cy.contains('label', 'Personal Loan').click();
    cy.typeInto('loanAmount', '500000');
    stepCount().should('equal', 7);
    cy.get('nav[aria-label^="Application progress"]').should('not.contain', 'Co-app');

    cy.typeInto('loanAmount', '500001');
    stepCount().should('equal', 8);
    cy.get('nav[aria-label^="Application progress"]').should('contain', 'Co-app');

    cy.contains('label', 'Home Loan').click();
    cy.typeInto('loanAmount', '500000');
    stepCount().should('equal', 8); // Home Loans always need a co-applicant
  });

  it('Journey 15 · raising the amount after reaching Step 5 inserts the co-applicant step', () => {
    cy.completeApplication(data);
    cy.get('button[aria-label^="Step 1: Choose your loan"]').click();
    cy.waitForStep('Choose your loan');
    cy.typeInto('loanAmount', '800000');
    cy.continueStep();

    // Earlier answers are kept — every step up to income is still complete.
    cy.waitForStep('About you');
    cy.get('[name="fullName"]').should('have.value', data.personal.fullName);
    cy.get('button[aria-label^="Step 5: Work and income"]').click();
    cy.waitForStep('Work and income');
    cy.continueStep();
    cy.waitForStep('Add a co-applicant');
    cy.contains('Personal Loans above ₹5,00,000 need a co-applicant — you asked for ₹8,00,000.').should('be.visible');
  });

  it('Journey 15 · switching to a Business Loan sends a salaried applicant back to Step 5', () => {
    cy.completeApplication(data);
    cy.get('button[aria-label^="Step 1: Choose your loan"]').click();
    cy.contains('label', 'Business Loan').click();
    cy.typeInto('loanAmount', '1500000');
    cy.get('[name="tenureMonths"]').select('60');
    cy.get('[name="purpose"]').select('working-capital');
    cy.continueStep();

    // Step 2 onwards are still valid; employment now fails the Business Loan rule.
    cy.get('button[aria-label^="Step 5: Work and income"]').click();
    cy.continueStep();
    cy.contains('Business Loans are for the self-employed and business owners.').should('be.visible');
  });

  it('browser Back walks the wizard without losing answers', () => {
    cy.fillStep1(data.loan);
    cy.continueStep();
    cy.waitForStep('About you');
    cy.typeInto('fullName', data.personal.fullName);
    cy.go('back');
    cy.waitForStep('Choose your loan');
    cy.get('[name="loanAmount"]').should('have.value', '3,00,000');
    cy.go('forward');
    cy.waitForStep('About you');
    cy.get('[name="fullName"]').should('have.value', data.personal.fullName);
  });
});
