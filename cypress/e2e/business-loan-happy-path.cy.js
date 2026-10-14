describe('Journey 3 — Business Loan, business owner with GSTIN', () => {
  it('collects GST, ITR and business registration and submits', () => {
    cy.fixture('valid-business-loan.json').then((data) => {
      cy.startApplication();
      cy.fillStep1(data.loan);
      cy.continueStep();
      cy.fillStep2(data.personal);
      cy.continueStep();
      cy.fillStep3(data.kyc);
      cy.continueStep();
      cy.fillStep4(data.address);
      cy.continueStep();
      cy.fillStep5(data.employment);
      cy.continueStep();

      // ₹15 lakh is under the ₹20 lakh threshold: no co-applicant step.
      cy.waitForStep('Documents and signature');
      ['Income tax returns', 'Business registration certificate', 'GST returns'].forEach((label) => {
        cy.contains('p', label).should('be.visible');
      });
      cy.contains('Salary slips').should('not.exist');
      cy.fillStep7(data.documents, data.personal.fullName);
      cy.continueStep();

      cy.waitForStep('Review and submit');
      cy.get('[data-testid="review-employment"]').should('contain', 'Business owner').and('contain', 'Manufacturing');
      cy.fillStep8();
      cy.get('[data-testid="submit-application"]').click();
      cy.get('[data-testid="submission-success"]', { timeout: 10000 }).should('be.visible');
    });
  });
});
