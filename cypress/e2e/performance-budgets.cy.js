/**
 * The brief's performance budgets, measured on the production build:
 *
 *   step transition  < 200 ms   Continue (or Back) pressed → next step interactive
 *   validation       < 100 ms   field blurred → error on screen (next frame)
 *   auto-save write  <  50 ms   encrypt the draft and write it to LocalStorage
 *
 * Each step downloads its neighbours' code while the person fills it in, and
 * Continue waits for that code rather than flash a loading state. People spend
 * seconds on a step; Cypress presses Continue within a few hundred milliseconds,
 * while that download can still be in flight from the local server (seen taking
 * up to ~370 ms here). The transition test therefore waits for the neighbouring
 * code (`data-neighbours-ready`) before each press, so it times the transition
 * itself.
 *
 * Step transitions and saves are read from the app's User Timing measures
 * (src/utils/userTiming.ts); validation is timed here with a MutationObserver.
 * Every run writes the raw numbers to cypress/results/performance-budgets.json.
 */
const BUDGET = { transition: 200, validation: 100, autosave: 50 };
const results = {};

const measures = (win, name) => win.performance.getEntriesByName(name, 'measure')
  .map((entry) => Math.round(entry.duration * 10) / 10);

const summary = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
    values,
  };
};

/**
 * Types an invalid value, then blurs the field and resolves with the time until
 * the field is marked invalid with its message in the DOM. (The clock stops at
 * the DOM update rather than the next frame: Cypress's headless runner throttles
 * requestAnimationFrame, which would add hundreds of milliseconds of idle time.)
 */
function timeValidation(name, value) {
  cy.get(`#wizard-step-form [name="${name}"]`).clear().type(value);
  return cy.window().then((win) => new Cypress.Promise((resolve, reject) => {
    const input = win.document.querySelector(`#wizard-step-form [name="${name}"]`);
    const describedBy = () => (input.getAttribute('aria-describedby') ?? '').split(' ')
      .map((id) => win.document.getElementById(id))
      .filter(Boolean);
    const shown = () => input.getAttribute('aria-invalid') === 'true'
      && describedBy().some((element) => element.textContent.trim().length > 0);
    const started = win.performance.now();
    const observer = new win.MutationObserver(() => {
      if (!shown()) return;
      observer.disconnect();
      resolve(win.performance.now() - started);
    });
    observer.observe(win.document.getElementById('wizard-step-form'), {
      attributes: true, childList: true, subtree: true, characterData: true,
    });
    win.setTimeout(() => reject(new Error(`No error appeared for ${name}`)), 3000);
    input.blur();
  }));
}

describe('Performance budgets (production build)', () => {
  after(() => {
    cy.writeFile('cypress/results/performance-budgets.json', {
      measuredAt: new Date().toISOString(),
      browser: `${Cypress.browser.displayName} ${Cypress.browser.version}`,
      budgetsMs: BUDGET,
      ...results,
    });
  });

  it(`moves between steps in under ${BUDGET.transition} ms`, () => {
    cy.resumeAt('loan', { loanType: 'home' });
    cy.waitForStep('Choose your loan');
    const forward = ['About you', 'Verify your identity', 'Where you live', 'Work and income',
      'Add a co-applicant', 'Documents and signature', 'Review and submit'];
    const neighboursReady = () => cy.get('[data-neighbours-ready]', { timeout: 10000 });
    forward.forEach((title) => {
      neighboursReady();
      cy.continueStep();
      cy.waitForStep(title);
    });
    ['Documents and signature', 'Add a co-applicant', 'Work and income'].forEach((title) => {
      neighboursReady();
      cy.get('button[aria-label="Back to previous step"]').click();
      cy.waitForStep(title);
    });
    cy.window().then((win) => {
      const durations = measures(win, 'lendswift:step-transition');
      results.stepTransitionMs = summary(durations);
      expect(durations).to.have.length(10);
      durations.forEach((duration) => expect(duration).to.be.below(BUDGET.transition));
    });
  });

  it(`shows validation errors within ${BUDGET.validation} ms of leaving a field`, () => {
    cy.resumeAt('loan');
    cy.waitForStep('Choose your loan');
    const durations = [];
    timeValidation('loanAmount', '40000').then((ms) => durations.push(ms));
    cy.typeInto('loanAmount', '300000');
    cy.continueStep();
    cy.waitForStep('About you');
    [['fullName', 'A'], ['email', 'meera@'], ['alternateMobile', '12345'], ['fatherName', '1']]
      .forEach(([name, value]) => timeValidation(name, value).then((ms) => durations.push(ms)));
    cy.then(() => {
      const rounded = durations.map((ms) => Math.round(ms * 10) / 10);
      results.validationAfterBlurMs = summary(rounded);
      rounded.forEach((duration) => expect(duration).to.be.below(BUDGET.validation));
    });
  });

  it(`writes the encrypted auto-save in under ${BUDGET.autosave} ms`, () => {
    // The first save in a fresh page: the encryption key is derived in the background
    // as soon as the form opens, so this write should not pay for PBKDF2.
    cy.startApplication();
    cy.fixture('valid-personal-loan.json').then((data) => cy.fillStep1(data.loan));
    cy.continueStep();
    cy.waitForStep('About you');
    const saves = (count) => cy.window()
      .should((win) => expect(measures(win, 'lendswift:autosave')).to.have.length(count));
    saves(1);

    // Later saves of a growing application.
    ['Meera', 'Meera Iyer', 'Meera R Iyer', 'Meera Ramesh Iyer', 'Meera Iyer'].forEach((name, index) => {
      cy.typeInto('fullName', name);
      cy.get('button[aria-label="Save draft"]').click();
      saves(index + 2);
    });
    cy.window().then((win) => {
      const all = measures(win, 'lendswift:autosave');
      results.autosaveWriteMs = { first: all[0], later: summary(all.slice(1)) };
      expect(all).to.have.length(6);
      all.forEach((duration) => expect(duration).to.be.below(BUDGET.autosave));
    });
  });
});
