const draftKeys = () => cy.getAllLocalStorage().then((storage) => Object.values(storage)
  .flatMap((entries) => Object.entries(entries))
  .filter(([key]) => key.startsWith('lendswift_draft_') && !key.endsWith('_meta')));

describe('Journey 12 — auto-save and resume', () => {
  let data;
  before(() => {
    cy.fixture('valid-personal-loan.json').then((fixture) => {
      data = fixture;
    });
  });

  beforeEach(() => {
    cy.startApplication();
    cy.fillStep1(data.loan);
    cy.continueStep();
    cy.waitForStep('About you');
    cy.typeInto('fullName', data.personal.fullName);
  });

  it('saves an encrypted draft and resumes on the same step after a reload', () => {
    cy.get('button[aria-label="Save draft"]').click();
    cy.contains(/Draft saved at/).should('be.visible');

    draftKeys().then((drafts) => {
      expect(drafts.map(([key]) => key)).to.deep.equal(['lendswift_draft_personal']);
      const [, value] = drafts[0];
      expect(value).to.match(/^v1\./);
      expect(value).not.to.contain(data.personal.fullName); // encrypted at rest
    });

    cy.reload();
    cy.contains('You have a saved application for Personal Loan. Resume or start fresh?').should('be.visible');
    cy.contains('button', 'Resume application').click();
    cy.waitForStep('About you');
    cy.get('[name="fullName"]').should('have.value', data.personal.fullName);
    cy.contains('nav[aria-label^="Application progress"] button', 'Step 1: Choose your loan').click();
    cy.get('[name="loanAmount"]').should('have.value', '3,00,000');
  });

  it('Start fresh deletes the saved draft', () => {
    cy.get('button[aria-label="Save draft"]').click();
    cy.reload();
    cy.contains('button', 'Start fresh').click();
    cy.waitForStep('Choose your loan');
    cy.get('input[name="loanType"]:checked').should('not.exist');
    draftKeys().should('have.length', 0);
  });

  it('detects a tampered draft and offers a clean start', () => {
    cy.get('button[aria-label="Save draft"]').click();
    cy.contains(/Draft saved at/);
    cy.window().then((win) => {
      const key = 'lendswift_draft_personal';
      const value = win.localStorage.getItem(key);
      const flipped = value.slice(0, -6) + (value.at(-6) === 'A' ? 'B' : 'A') + value.slice(-5);
      win.localStorage.setItem(key, flipped);
    });
    cy.reload();
    cy.contains('button', 'Resume application').click();
    cy.contains("We couldn't restore your saved application").should('be.visible');
    cy.contains('damaged or was changed outside this app').should('be.visible');
    cy.contains('button', 'Start a new application').click();
    cy.waitForStep('Choose your loan');
    draftKeys().should('have.length', 0);
  });

  it('saved automatically when Continue moved to Step 2, without pressing Save draft', () => {
    draftKeys().should('have.length', 1);
    cy.getAllLocalStorage().then((storage) => {
      const entries = Object.assign({}, ...Object.values(storage));
      const meta = JSON.parse(entries.lendswift_draft_personal_meta);
      expect(meta).to.include({ version: '1.0', step: 'personal', loanType: 'personal' });
    });
  });
});
