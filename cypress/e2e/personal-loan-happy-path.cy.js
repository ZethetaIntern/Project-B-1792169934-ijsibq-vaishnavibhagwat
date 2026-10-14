describe('Journey 1 — Personal Loan, salaried, happy path', () => {
  it('applies from Step 1 to a submitted application with a UUID reference', () => {
    cy.fixture('valid-personal-loan.json').then((data) => {
      cy.startApplication();
      cy.completeApplication(data);

      // Step 6 is skipped at ₹3 lakh, and the PAN copy was optional after verification.
      cy.contains('Step 7 of 7');
      cy.get('[data-testid="review-documents"]').should('contain', 'Not provided (optional)');

      cy.get('[data-testid="key-fact-statement"]').should('contain', '₹3,00,000').and('contain', '₹9,751');
      cy.get('[data-testid="submit-application"]').should('be.disabled');
      cy.fillStep8();
      cy.get('[data-testid="submit-application"]').should('be.enabled').click();

      cy.get('[data-testid="submission-success"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="submission-reference"]').invoke('text')
        .should('match', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      cy.getAllLocalStorage().then((storage) => {
        const keys = Object.values(storage).flatMap((entries) => Object.keys(entries));
        expect(keys.filter((key) => key.startsWith('lendswift_draft_'))).to.have.length(0);
      });
    });
  });
});
