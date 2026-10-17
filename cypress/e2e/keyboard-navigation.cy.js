/** True when the element shows a focus ring (outline or box-shadow). */
const hasVisibleFocus = ($el) => {
  const style = getComputedStyle($el[0]);
  return (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') || style.boxShadow !== 'none';
};

describe('Journey 13 — keyboard-only navigation', () => {
  it('offers a skip link that jumps to the main content', () => {
    cy.startApplication();
    cy.get('a[href="#main-content"]').focus().should('be.visible');
    cy.realPress('Enter');
    cy.location('hash').should('equal', '#main-content');
  });

  it('completes Step 1 with Tab, Space, arrows and Enter, then focuses the next step', () => {
    cy.startApplication();
    cy.get('input[name="loanType"][value="personal"]').focus();
    cy.realPress('Space');
    cy.get('input[name="loanType"][value="personal"]').should('be.checked');
    cy.realPress('ArrowRight');
    cy.get('input[name="loanType"][value="home"]').should('be.checked').and('be.focused');
    cy.realPress('ArrowLeft');
    cy.get('input[name="loanType"][value="personal"]').should('be.checked');

    cy.realPress('Tab');
    cy.focused().should('have.attr', 'name', 'loanAmount').then(($input) => {
      expect(hasVisibleFocus($input), 'visible focus ring').to.equal(true);
    });
    cy.realType('300000');

    cy.realPress('Tab'); // amount slider
    cy.focused().should('have.attr', 'type', 'range');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'name', 'tenureMonths');
    cy.realPress('ArrowDown');
    cy.focused().invoke('val').should('not.be.empty');
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'name', 'purpose');
    cy.realPress('ArrowDown');
    cy.focused().invoke('val').should('not.be.empty');

    cy.realPress('Tab');
    cy.focused().should('have.attr', 'name', 'referralCode');
    cy.realPress('Enter'); // implicit submit = Continue
    cy.waitForStep('About you');
    cy.focused().should('have.attr', 'name', 'fullName');
  });

  it('moves focus to the first invalid field when Continue fails', () => {
    cy.startApplication();
    cy.get('input[name="loanType"][value="personal"]').focus();
    cy.realPress('Space');
    cy.get('button[type="submit"][form="wizard-step-form"]').focus();
    cy.realPress('Enter');
    cy.focused().should('have.attr', 'name', 'loanAmount');
    cy.focused().should('have.attr', 'aria-invalid', 'true');
  });

  it('traps focus in a dialog and returns it to the trigger on Escape', () => {
    cy.visit('/');
    cy.contains('button', 'Try demo application').as('trigger').focus();
    cy.realPress('Enter');
    cy.get('[role="dialog"]').should('be.visible');
    for (let press = 0; press < 12; press += 1) cy.realPress('Tab');
    cy.focused().closest('[role="dialog"]').should('exist');
    cy.realPress('Escape');
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('@trigger').should('be.focused');
  });

  it('never hides the focused field under the sticky header or step actions (WCAG 2.4.11)', () => {
    cy.viewport(812, 375); // a phone on its side leaves the least room between the two
    cy.resumeAt('address');
    cy.get('[role="dialog"]').should('not.exist');
    cy.document().then((doc) => {
      // Jump instead of animating, so each check sees where the browser settled.
      doc.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
    });
    const checked = new Set();
    for (let press = 0; press < 20; press += 1) {
      cy.realPress('Tab');
      cy.document().then((doc) => {
        const element = doc.activeElement;
        if (!element || element === doc.body || element.closest('header, .sticky')
          || element.matches('a[href="#main-content"]')) return;
        const box = element.getBoundingClientRect();
        const top = doc.querySelector('header').getBoundingClientRect().bottom;
        const bottom = doc.querySelector('.sticky.bottom-0').getBoundingClientRect().top;
        const visible = Math.min(box.bottom, bottom) - Math.max(box.top, top);
        const name = element.getAttribute('name') ?? element.textContent.trim();
        expect(visible, `visible height of focused ${name}`).to.be.closeTo(box.height, 1);
        checked.add(name);
      });
    }
    cy.then(() => expect(checked.size, 'fields checked').to.be.at.least(8));
  });

  it('keeps focus on the field after verifying it by keyboard, and announces the result', () => {
    cy.resumeAt('personal', {
      edit: (data) => Object.assign(data.personal, { mobileVerified: false }),
    });
    cy.get('button[aria-label="Verify mobile number"]').focus();
    cy.realPress('Enter');
    cy.get('[data-testid="demo-otp"]').invoke('text').then((code) => {
      cy.focused().should('have.attr', 'autocomplete', 'one-time-code');
      cy.realType(code.trim());
      cy.realPress('Enter');
    });
    cy.get('input[autocomplete="one-time-code"]', { timeout: 6000 }).should('not.exist');
    cy.focused().should('have.attr', 'name', 'mobile');
    cy.contains('[role="status"]', 'Mobile number verified.').should('exist');

    cy.resumeAt('kyc', { edit: (data) => Object.assign(data.kyc, { panVerified: false }) });
    cy.get('button[aria-label="Verify PAN"]').focus();
    cy.realPress('Enter');
    cy.focused().should('have.attr', 'name', 'pan');
    cy.contains('[role="status"]', 'PAN verified.', { timeout: 6000 }).should('exist');
    cy.focused().should('have.attr', 'name', 'pan');
  });
});
