/**
 * Touch targets of at least 44×44 px on touch screens (the brief's accessibility
 * list, WCAG 2.5.5), on the landing page and every step: a 320 px phone, a phone
 * on its side and a tablet both ways. The browser is switched to touch emulation
 * (pointer: coarse), as on a real phone or tablet; with a mouse, controls on
 * screens 640 px and wider are allowed to be more compact.
 *
 * A control's target is its own box grown by its labels and everything inside
 * them: tapping a label activates its control, and checkbox labels stretch an
 * invisible overlay across their row. Links inside running text are exempt, as
 * WCAG allows, and so are visually hidden controls such as the skip link.
 */
const MIN = 44;
const CONTROLS = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="radio"], [role="checkbox"], [role="option"]';

function targetBox(element) {
  const rects = [element.getBoundingClientRect()];
  [...(element.labels ?? [])].forEach((label) => {
    rects.push(label.getBoundingClientRect());
    label.querySelectorAll('*').forEach((child) => rects.push(child.getBoundingClientRect()));
  });
  const drawn = rects.filter((rect) => rect.width > 0 && rect.height > 0);
  const left = Math.min(...drawn.map((rect) => rect.left));
  const top = Math.min(...drawn.map((rect) => rect.top));
  return {
    width: Math.max(...drawn.map((rect) => rect.right)) - left,
    height: Math.max(...drawn.map((rect) => rect.bottom)) - top,
  };
}

function describeControl(element) {
  const name = element.getAttribute('aria-label') || element.textContent.trim() || element.getAttribute('name') || '';
  return `<${element.tagName.toLowerCase()}${element.type ? ` type=${element.type}` : ''}> "${name.slice(0, 40)}"`;
}

const PHONE = [320, 640];
const TOUCH_SCREENS = [PHONE, [812, 375], [768, 1024], [1024, 768]];

/** Every visible control whose target is under 44×44 px. */
function smallControls(doc) {
  return [...doc.querySelectorAll(CONTROLS)].flatMap((element) => {
    const own = element.getBoundingClientRect();
    const style = doc.defaultView.getComputedStyle(element);
    if (own.width === 0 || own.height === 0 || style.visibility === 'hidden') return [];
    if (style.display === 'inline' && element.closest('p, li, label')) return [];
    if (style.clipPath === 'inset(50%)') return []; // visually hidden (sr-only)
    const box = targetBox(element);
    if (box.width >= MIN - 0.5 && box.height >= MIN - 0.5) return [];
    return [`${describeControl(element)} ${Math.round(box.width)}×${Math.round(box.height)}`];
  });
}

/** Resizes through the screens and fails with every undersized control found. */
/**
 * Waits for entrances to finish (a dialog grows in from 98%), so controls are
 * measured at their real size. Endless animations, such as spinners, are ignored.
 */
function waitForAnimations() {
  cy.document().should((doc) => {
    const running = doc.getAnimations()
      .filter((animation) => animation.playState === 'running'
        && animation.effect?.getComputedTiming().endTime !== Infinity);
    expect(running, 'animations still running').to.have.length(0);
  });
}

function checkTouchTargets(where, screens = TOUCH_SCREENS) {
  const small = [];
  screens.forEach(([width, height]) => {
    cy.viewport(width, height);
    waitForAnimations();
    cy.document().then((doc) => {
      small.push(...smallControls(doc).map((control) => `${width}×${height} ${control}`));
    });
  });
  cy.then(() => expect(small, `controls under ${MIN}×${MIN} px on ${where}`).to.deep.equal([]));
}

/** Makes the browser report a touch screen (pointer: coarse) instead of a mouse. */
const emulateTouch = (enabled) => cy.then(() => Cypress.automation('remote:debugger:protocol', {
  command: 'Emulation.setTouchEmulationEnabled',
  params: enabled ? { enabled, maxTouchPoints: 5 } : { enabled },
}));

describe('Touch targets — 44×44 px on phones and tablets, both ways up', () => {
  beforeEach(() => {
    emulateTouch(true);
    cy.viewport(...PHONE);
  });
  after(() => emulateTouch(false));

  it('on the landing page and the demo launcher', () => {
    cy.visit('/');
    cy.contains('h1', /./).should('be.visible');
    checkTouchTargets('the landing page');
    cy.contains('button', 'Try demo application').click();
    cy.get('[role="dialog"]').should('be.visible');
    checkTouchTargets('the demo launcher');
  });

  it('on Step 1, with the step list open', () => {
    cy.startApplication();
    checkTouchTargets('Step 1');
    cy.viewport(...PHONE);
    cy.contains('button', 'All steps').click();
    cy.get('nav[aria-label^="Application progress"] ol').should('be.visible');
    checkTouchTargets('the step list', [PHONE]);
    cy.checkPageA11y('body');
  });

  it('on the one-time-code panel', () => {
    cy.resumeAt('personal', {
      edit: (data) => Object.assign(data.personal, { mobileVerified: false }),
    });
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('button[aria-label="Verify mobile number"]').click();
    cy.get('input[autocomplete="one-time-code"]').should('be.visible');
    checkTouchTargets('the one-time-code panel');
  });

  ['personal', 'kyc', 'address', 'employment', 'coApplicant', 'documents', 'review'].forEach((stepId) => {
    it(`on the ${stepId} step`, () => {
      cy.resumeAt(stepId, { loanType: 'home' });
      cy.get('[role="dialog"]').should('not.exist'); // the resume prompt has closed
      checkTouchTargets(`the ${stepId} step`);
    });
  });
});
