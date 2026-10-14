const MB = 1024 * 1024;

describe('Journey 10 — file upload, compression and rejection', () => {
  beforeEach(() => {
    cy.fixture('valid-personal-loan.json').then((data) => {
      cy.startApplication();
      cy.reachDocumentsStep(data);
    });
  });

  it('previews a PDF, compresses a large photo and enforces the one-file limit', () => {
    cy.uploadDocument('bankStatements', 'sample.pdf');
    cy.get('[data-testid="upload-bankStatements"]').within(() => {
      cy.get('[data-testid="uploaded-file"]').should('contain', 'sample.pdf');
      cy.get('[data-testid="uploaded-file"]').contains('Verified', { timeout: 6000 });
    });

    // 2.8 MB photo on a 2 MB slot: compressed on the device, then accepted.
    cy.uploadDocument('photograph', 'large-photo.jpg');
    cy.get('[data-testid="upload-photograph"]').within(() => {
      cy.contains('compressed on your device', { timeout: 15000 }).should('be.visible');
      cy.get('[data-testid="file-thumbnail"]').should('be.visible');
      cy.contains('button', /^Choose file$/).should('not.exist');
    });
    cy.get('[data-testid="upload-photograph"] [aria-live="polite"]').should('contain', 'Compressed from');
  });

  it('rejects the wrong type, an oversized PDF and a renamed file with specific messages', () => {
    cy.uploadDocument('salarySlips', 'notes.txt');
    cy.contains('“notes.txt” is not a PDF file. Choose a PDF instead.').should('be.visible');

    cy.get('[data-testid="upload-input-bankStatements"]').selectFile({
      contents: Cypress.Buffer.concat([Cypress.Buffer.from('%PDF-1.4\n'), Cypress.Buffer.alloc(11 * MB)]),
      fileName: 'huge.pdf',
      mimeType: 'application/pdf',
    }, { force: true });
    cy.contains('“huge.pdf” is 11 MB — the limit is 10 MB.').should('be.visible');

    cy.get('[data-testid="upload-input-salarySlips"]').selectFile({
      contents: Cypress.Buffer.from('MZ this is not a PDF'),
      fileName: 'payslip.pdf',
      mimeType: 'application/pdf',
    }, { force: true });
    cy.contains('“payslip.pdf” does not look like a real PDF').should('be.visible');
    cy.get('[data-testid="upload-salarySlips"] [data-testid="uploaded-file"]').should('not.exist');
  });

  it('removes an uploaded file and announces it', () => {
    cy.uploadDocument('bankStatements', 'sample.pdf');
    cy.get('button[aria-label="Remove sample.pdf"]', { timeout: 8000 }).click();
    cy.get('[data-testid="upload-bankStatements"] [data-testid="uploaded-file"]').should('not.exist');
    cy.get('[data-testid="upload-bankStatements"] [aria-live="polite"]').should('contain', 'sample.pdf removed.');
  });
});
