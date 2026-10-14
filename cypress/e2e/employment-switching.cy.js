describe('Journey 8 — Step 5 employment switching clears stale data', () => {
  it('asks before switching, keeps data on cancel and clears it on confirm', () => {
    cy.fixture('valid-personal-loan.json').then((data) => {
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

      // Cancelling keeps every salaried answer.
      cy.contains('label', 'Self-employed').click();
      cy.get('[role="alertdialog"]').should('contain', 'Switch to Self-employed?');
      cy.contains('button', 'Keep salaried').click();
      cy.get('[name="companyName"]').should('have.value', data.employment.companyName);

      // Confirming clears them; the business sub-form appears instead.
      cy.contains('label', 'Self-employed').click();
      cy.contains('button', 'Switch and clear').click();
      cy.get('[name="companyName"]').should('not.exist');
      cy.get('[name="businessName"]').should('be.visible').and('have.value', '');

      // Switching back starts the salaried form empty — nothing stale comes back.
      cy.contains('label', 'Salaried').click();
      cy.get('[role="alertdialog"]').should('not.exist'); // nothing typed yet, so no prompt
      cy.get('[name="companyName"]').should('have.value', '');
      cy.get('[name="monthlySalary"]').should('have.value', '');
    });
  });

  it('does not offer Salaried for a Business Loan', () => {
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
      cy.waitForStep('Work and income');
      cy.contains('label', 'Salaried').should('contain', 'Not available for Business Loans.');
    });
  });
});
