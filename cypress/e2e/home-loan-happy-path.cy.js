describe('Journey 2 — Home Loan with co-applicant and property documents', () => {
  it('includes the co-applicant step, passport field and property documents', () => {
    cy.fixture('valid-home-loan.json').then((data) => {
      cy.startApplication();
      cy.fillStep1(data.loan);
      cy.continueStep();
      cy.fillStep2(data.personal);
      cy.continueStep();

      // Home Loans above ₹50 lakh ask for a passport number.
      cy.get('[name="passportNumber"]').should('be.visible');
      cy.fillStep3(data.kyc);
      cy.continueStep();
      cy.fillStep4(data.address);
      cy.continueStep();
      cy.fillStep5(data.employment);
      cy.continueStep();

      // Married applicant → Spouse is the default relationship.
      cy.waitForStep('Add a co-applicant');
      cy.get('[name="relationship"]').should('have.value', 'spouse');
      cy.fillStep6(data.coApplicant);
      cy.continueStep();

      cy.contains('Property documents').should('be.visible');
      cy.fillStep7(data.documents, data.personal.fullName);
      cy.continueStep();

      cy.waitForStep('Review and submit');
      cy.get('[data-testid="review-coApplicant"]').should('contain', 'Priya Kulkarni').and('contain', 'Spouse');
      cy.get('[data-testid="key-fact-statement"]').should('contain', 'including your co-applicant');
      cy.fillStep8();
      cy.get('[data-testid="submit-application"]').click();
      cy.get('[data-testid="submission-success"]', { timeout: 10000 }).should('be.visible');
    });
  });
});
