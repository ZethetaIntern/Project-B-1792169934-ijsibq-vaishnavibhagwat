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

  it('keeps every answer through 9 back-and-forth passes that change the loan type each time', () => {
    const loans = [
      {
        type: 'Home Loan', key: 'home', amount: '4000000', shown: '40,00,000', tenureMonths: '240', purpose: 'ready-property', steps: 8,
      },
      {
        type: 'Business Loan', key: 'business', amount: '1500000', shown: '15,00,000', tenureMonths: '60', purpose: 'working-capital', steps: 7,
      },
      {
        type: 'Personal Loan', key: 'personal', amount: '300000', shown: '3,00,000', tenureMonths: '36', purpose: 'medical', steps: 7,
      },
    ];
    const onlyDraftFor = (key) => cy.window().should((win) => {
      const drafts = Object.keys(win.localStorage)
        .filter((name) => name.startsWith('lendswift_draft_') && !name.endsWith('_meta'));
      expect(drafts).to.deep.equal([`lendswift_draft_${key}`]);
    });

    cy.fillStep1(data.loan);
    cy.continueStep();
    cy.waitForStep('About you');
    cy.typeInto('fullName', data.personal.fullName);
    cy.typeInto('email', data.personal.email);

    let previous = loans[2];
    for (let pass = 0; pass < 9; pass += 1) {
      const loan = loans[pass % loans.length];
      cy.get('button[aria-label="Back to previous step"]').click();
      cy.waitForStep('Choose your loan');
      cy.get('[name="loanAmount"]').should('have.value', previous.shown);

      cy.contains('label', loan.type).click();
      cy.typeInto('loanAmount', loan.amount);
      cy.get('[name="tenureMonths"]').select(loan.tenureMonths);
      cy.get('[name="purpose"]').select(loan.purpose);
      cy.continueStep();

      cy.waitForStep('About you');
      cy.contains(`Step 2 of ${loan.steps}`).should('be.visible');
      cy.get('aside[aria-label="Application summary"]').should('contain', loan.type);
      cy.get('[name="fullName"]').should('have.value', data.personal.fullName);
      cy.get('[name="email"]').should('have.value', data.personal.email);
      // The draft follows the loan type: one key, never a stale copy under the old type.
      onlyDraftFor(loan.key);
      previous = loan;
    }
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
