/**
 * Touch targets of at least 44×44 px on phones (the brief's accessibility list,
 * WCAG 2.5.5), checked at 320 px wide, the narrowest supported screen, on the
 * landing page and every step.
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

/** Fails with a list of every visible control whose target is under 44×44 px. */
function checkTouchTargets(where) {
  cy.document().then((doc) => {
    const small = [...doc.querySelectorAll(CONTROLS)].flatMap((element) => {
      const own = element.getBoundingClientRect();
      const style = doc.defaultView.getComputedStyle(element);
      if (own.width === 0 || own.height === 0 || style.visibility === 'hidden') return [];
      if (style.display === 'inline' && element.closest('p, li, label')) return [];
      if (style.clipPath === 'inset(50%)') return []; // visually hidden (sr-only)
      const box = targetBox(element);
      if (box.width >= MIN - 0.5 && box.height >= MIN - 0.5) return [];
      return [`${describeControl(element)} ${Math.round(box.width)}×${Math.round(box.height)}`];
    });
    expect(small, `controls under ${MIN}×${MIN} px on ${where}`).to.deep.equal([]);
  });
}

describe('Touch targets — 44×44 px at 320 px wide', () => {
  beforeEach(() => cy.viewport(320, 640));

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
    cy.contains('button', 'All steps').click();
    cy.get('nav[aria-label^="Application progress"] ol').should('be.visible');
    checkTouchTargets('the step list');
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
