/**
 * No horizontal scrolling at any supported size, in portrait and landscape: the
 * landing page and every step are opened once, then the viewport is turned and
 * resized around them the way a phone or tablet rotates, from 320 px to 1920 px.
 * A failure names the elements that stick out past the right edge.
 */
const VIEWPORTS = [
  [320, 568], [375, 812], [812, 375], [414, 896], [768, 1024], [1024, 768],
  [1280, 900], [1440, 900], [1920, 1080],
];

function checkNoHorizontalScroll(where) {
  VIEWPORTS.forEach(([width, height]) => {
    cy.viewport(width, height);
    cy.document().then((doc) => {
      const root = doc.documentElement;
      const outside = root.scrollWidth > root.clientWidth
        ? [...doc.body.querySelectorAll('*')]
          .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 0.5)
          .slice(0, 5)
          .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).split(' ').slice(0, 3).join('.')}`)
        : [];
      expect(outside, `elements past the right edge of ${where} at ${width}×${height}`).to.deep.equal([]);
    });
    if (Cypress.env('SHOTS')) cy.screenshot(`${where} ${width}x${height}`, { capture: 'viewport' });
  });
}

describe('Responsive layout — portrait, landscape, 320 to 1920 px', () => {
  it('on the landing page', () => {
    cy.visit('/');
    cy.contains('h1', /./).should('be.visible');
    checkNoHorizontalScroll('landing');
  });

  it('on Step 1', () => {
    cy.startApplication();
    checkNoHorizontalScroll('loan');
  });

  ['personal', 'kyc', 'address', 'employment', 'coApplicant', 'documents', 'review'].forEach((stepId) => {
    it(`on the ${stepId} step`, () => {
      cy.resumeAt(stepId, { loanType: 'home' });
      cy.get('[role="dialog"]').should('not.exist');
      checkNoHorizontalScroll(stepId);
    });
  });
});
