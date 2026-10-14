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
});
