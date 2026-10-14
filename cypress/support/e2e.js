import 'cypress-axe';
import './commands';

// Every test starts without drafts or a running demo. Stored files (IndexedDB)
// are cleared by `cy.startApplication()`, which visits the app's own origin.
beforeEach(() => {
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();
});
