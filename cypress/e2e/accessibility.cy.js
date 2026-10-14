describe('Accessibility — axe (WCAG 2.1 A and AA) on every screen', () => {
  it('has no violations on the landing page or the demo launcher', () => {
    cy.visit('/');
    cy.checkPageA11y('body');
    cy.contains('button', 'Try demo application').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.checkPageA11y('[role="dialog"]');
  });

  it('has no violations on any of the eight steps, errors included, or the success dialog', () => {
    cy.fixture('valid-home-loan.json').then((data) => {
      cy.startApplication();
      cy.continueStep(); // error state on Step 1
      cy.checkPageA11y();
      cy.fillStep1(data.loan);
      cy.continueStep();

      cy.fillStep2(data.personal);
      cy.checkPageA11y();
      cy.continueStep();

      cy.fillStep3(data.kyc);
      cy.checkPageA11y();
      cy.continueStep();

      cy.fillStep4(data.address);
      cy.checkPageA11y();
      cy.continueStep();

      cy.fillStep5(data.employment);
      cy.checkPageA11y();
      cy.continueStep();

      cy.fillStep6(data.coApplicant);
      cy.checkPageA11y();
      cy.continueStep();

      cy.waitForStep('Documents and signature');
      cy.checkPageA11y();
      cy.fillStep7(data.documents, data.personal.fullName);
      cy.checkPageA11y();
      cy.continueStep();

      cy.waitForStep('Review and submit');
      cy.checkPageA11y();
      cy.fillStep8();
      cy.get('[data-testid="submit-application"]').click();
      cy.get('[data-testid="submission-success"]', { timeout: 10000 }).should('be.visible');
      cy.checkPageA11y('[role="dialog"]');
    });
  });
});
