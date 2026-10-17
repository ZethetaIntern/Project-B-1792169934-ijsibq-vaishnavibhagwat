/**
 * The same application open in three tabs at once. Tabs B and C are same-origin
 * iframes: separate documents and JavaScript realms (each with its own tab id)
 * sharing one LocalStorage and receiving each other's `storage` events, which is
 * how real browser tabs relate. Cypress cannot drive several tabs, so this is the
 * closest faithful setup.
 */
const SAVE = 'button[aria-label="Save draft"]';
const BANNER = 'This application is open in another tab';

function openTab(id) {
  cy.document().then((doc) => {
    const frame = doc.createElement('iframe');
    frame.id = id;
    frame.title = `Tab ${id}`;
    frame.src = '/apply';
    frame.style.cssText = 'display:block;width:1280px;height:900px;border:0';
    doc.body.appendChild(frame);
  });
}

/** Runs commands inside a tab's document once its app has rendered. */
function inTab(id, commands) {
  cy.get(`iframe#${id}`)
    .its('0.contentDocument.body')
    .should(($body) => expect($body.querySelector('#root')?.childElementCount).to.be.greaterThan(0))
    .then((body) => cy.wrap(body).within(commands));
}

/**
 * `cy.typeInto` for a field inside a tab. Cypress's `.blur()` only sees the top
 * document (where the iframe itself has focus), so the field's own blur() runs
 * the on-blur validation instead.
 */
function typeInTab(name, value) {
  cy.get(`#wizard-step-form [name="${name}"]`).clear().type(value)
    .then(($input) => $input[0].blur());
}

/** Dismisses the other-tab warning if an earlier save (e.g. a resume) raised it. */
function dismissBannerIfShown() {
  cy.root().then(($root) => {
    const button = [...$root[0].querySelectorAll('button')]
      .find((element) => element.textContent.trim() === 'Continue in this tab');
    button?.click();
  });
  cy.contains(BANNER).should('not.exist');
}

const draftsByKey = (win) => Object.fromEntries(Object.keys(win.localStorage)
  .filter((key) => key.startsWith('lendswift_draft_') && key.endsWith('_meta'))
  .map((key) => [key.replace('_meta', ''), JSON.parse(win.localStorage.getItem(key))]));

describe('Three tabs open at once', () => {
  let data;
  before(() => {
    cy.fixture('valid-personal-loan.json').then((fixture) => {
      data = fixture;
    });
  });

  it('warns the other tabs when one saves, and keeps drafts for different loan types apart', () => {
    // Tab A: the page Cypress drives.
    cy.startApplication();
    cy.fillStep1(data.loan);
    cy.continueStep();
    cy.waitForStep('About you');
    cy.typeInto('fullName', data.personal.fullName);
    cy.get(SAVE).click();
    cy.contains(/Draft saved at/).should('be.visible');

    // Tabs B and C open later and resume A's draft.
    ['B', 'C'].forEach((id) => {
      openTab(id);
      inTab(id, () => {
        cy.contains('button', 'Resume application').click();
        cy.contains('h1', 'About you').should('be.visible');
        cy.get('[name="fullName"]').should('have.value', data.personal.fullName);
      });
    });

    // Resuming saves too, so the earlier tabs are warned: A by B and C, B by C.
    // Storage events arrive a little after the write, so wait until C's warning
    // has reached B before starting from a clean slate in every tab.
    inTab('B', () => cy.contains('[role="alert"]', BANNER).should('be.visible'));
    dismissBannerIfShown();
    inTab('B', dismissBannerIfShown);
    inTab('C', dismissBannerIfShown);

    // B saves: A and C are told, B is not.
    inTab('B', () => {
      typeInTab('fatherName', data.personal.fatherName);
      cy.get(SAVE).click();
      cy.contains(/Draft saved at/).should('be.visible');
      cy.contains(BANNER).should('not.exist');
    });
    cy.contains('[role="alert"]', BANNER).should('be.visible');
    inTab('C', () => cy.contains('[role="alert"]', BANNER).should('be.visible'));

    // A carries on: the banner goes, and A's save warns B in turn.
    cy.contains('button', 'Continue in this tab').click();
    cy.contains(BANNER).should('not.exist');
    cy.get(SAVE).click();
    inTab('B', () => cy.contains('[role="alert"]', BANNER).should('be.visible'));

    // C edits and saves the Personal Loan too: last writer wins, and A is warned.
    cy.contains('button', 'Continue in this tab').should('not.exist');
    inTab('C', () => {
      cy.contains('button', 'Continue in this tab').click();
      typeInTab('motherName', data.personal.motherName);
      cy.get(SAVE).click();
      cy.contains(/Draft saved at/).should('be.visible');
    });
    cy.contains('[role="alert"]', BANNER).should('be.visible');

    // C then switches to a Business Loan: the draft it last wrote moves to the
    // business key. A was warned, keeps its answers, and its next save puts the
    // Personal Loan draft back, so each loan type ends with its own draft.
    inTab('C', () => {
      cy.get('button[aria-label="Back to previous step"]').click();
      cy.contains('h1', 'Choose your loan').should('be.visible');
      cy.contains('label', 'Business Loan').click();
      typeInTab('loanAmount', '1500000');
      cy.get('[name="tenureMonths"]').select('60');
      cy.get('[name="purpose"]').select('working-capital');
      cy.get('button[type="submit"][form="wizard-step-form"]').click();
      cy.contains('h1', 'About you').should('be.visible');
    });
    cy.contains('button', 'Continue in this tab').click();
    cy.get('[name="fullName"]').should('have.value', data.personal.fullName);
    cy.get(SAVE).click();
    cy.window().should((win) => {
      const drafts = draftsByKey(win);
      expect(Object.keys(drafts).sort())
        .to.deep.equal(['lendswift_draft_business', 'lendswift_draft_personal']);
      const { lendswift_draft_business: business, lendswift_draft_personal: personal } = drafts;
      expect(business).to.include({ loanType: 'business' });
      expect(personal).to.include({ loanType: 'personal' });
      expect(business.tabId).not.to.equal(personal.tabId);
    });
    // A business save is not a conflict for a Personal Loan tab.
    cy.contains(BANNER).should('not.exist');
  });
});
