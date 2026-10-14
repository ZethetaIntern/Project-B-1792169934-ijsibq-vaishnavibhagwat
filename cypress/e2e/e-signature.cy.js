describe('Journey 11 — e-signature capture, clear and review', () => {
  it('draws, clears, redraws, hides on blur and shows the signature on the review page', () => {
    cy.fixture('valid-personal-loan.json').then((data) => {
      cy.startApplication();
      cy.reachDocumentsStep(data);

      cy.contains('[role="group"]', 'Your signature').within(() => {
        cy.contains('button', 'Use this signature').should('be.disabled');
      });
      cy.drawSignature('Your signature');
      cy.contains('[role="group"]', 'Your signature').within(() => {
        cy.contains('button', 'Use this signature').should('be.enabled');
        cy.contains('button', 'Clear').click();
        cy.contains('button', 'Use this signature').should('be.disabled');
      });

      cy.drawSignature('Your signature');
      cy.contains('[role="group"]', 'Your signature').within(() => {
        cy.contains('button', 'Use this signature').click();
        cy.get('[data-testid="signature-preview"]').should('be.visible')
          .and('have.attr', 'src').and('match', /^data:image\/png;base64,/);
      });

      // Anti-capture shield while the window is in the background.
      cy.window().trigger('blur');
      cy.contains('Signature hidden while this window is inactive').should('be.visible');
      cy.window().trigger('focus');
      cy.contains('Signature hidden while this window is inactive').should('not.exist');

      // Keyboard alternative: redraw by typing a name instead.
      cy.contains('button', 'Redraw signature').click();
      cy.typeSignature('Your signature', data.personal.fullName);
      cy.get('[data-testid="signature-preview"]').should('be.visible');

      Object.entries(data.documents).forEach(([id, fixture]) => cy.uploadDocument(id, fixture));
      cy.get('[data-testid="uploaded-file"]', { timeout: 15000 }).should('have.length', 4);
      cy.continueStep();
      cy.waitForStep('Review and submit');
      cy.get('[data-testid="review-signature"]').should('be.visible');
      cy.contains(`Typed by ${data.personal.fullName}`).should('be.visible');
    });
  });
});
