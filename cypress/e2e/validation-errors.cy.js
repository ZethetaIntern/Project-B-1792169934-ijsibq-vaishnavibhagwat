const isoDate = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

describe('Validation errors — one journey per step', () => {
  let personal;
  before(() => {
    cy.fixture('valid-personal-loan.json').then((data) => {
      personal = data;
    });
  });

  beforeEach(() => cy.startApplication());

  it('Journey 4 · Step 1: empty Continue, amount limits, and errors clearing on fix', () => {
    // Nothing red on first render: the live regions exist but are empty.
    cy.get('#wizard-step-form [role="alert"]').each(($alert) => {
      expect($alert.text().trim()).to.equal('');
    });
    cy.continueStep();
    cy.contains('Choose the type of loan you need.').should('be.visible');
    cy.focused().should('have.attr', 'name', 'loanType');

    cy.contains('label', 'Personal Loan').click();
    cy.typeInto('loanAmount', '40000');
    cy.contains('The minimum loan amount is ₹50,000.').should('be.visible');
    cy.typeInto('loanAmount', '1100000');
    cy.contains('Personal Loans go up to ₹10,00,000. Enter a smaller amount.').should('be.visible');
    cy.typeInto('loanAmount', '300000');
    cy.contains('Personal Loans go up to').should('not.exist');
    cy.get('[name="referralCode"]').type('AB!').blur();
    cy.get('[name="referralCode"]').should('have.attr', 'aria-invalid', 'true');
  });

  it('Journey 5 · Step 2: age limits (21 today passes, a day short fails) and email shown only after blur', () => {
    cy.fillStep1(personal.loan);
    cy.continueStep();
    cy.waitForStep('About you');

    const today = new Date();
    const dayShort = new Date(today.getFullYear() - 21, today.getMonth(), today.getDate() + 1);
    cy.get('[name="dateOfBirth"]').type(isoDate(dayShort)).blur();
    cy.contains('You must be at least 21 years old to apply. You are 20 today.').should('be.visible');

    const exactly21 = new Date(today.getFullYear() - 21, today.getMonth(), today.getDate());
    cy.get('[name="dateOfBirth"]').clear().type(isoDate(exactly21)).blur();
    cy.contains('You must be at least 21').should('not.exist');

    cy.get('[name="email"]').type('meera@');
    cy.contains('Enter an email address like name@example.com.').should('not.exist');
    cy.get('[name="email"]').blur();
    cy.contains('Enter an email address like name@example.com.').should('be.visible');
    cy.typeInto('email', personal.personal.email);
    cy.contains('Enter an email address like').should('not.exist');

    cy.continueStep();
    cy.contains('Enter your mobile number.').should('be.visible');
  });

  it('Journey 6 · Step 3: PAN entity check, Aadhaar checksum and consent', () => {
    cy.fillStep1(personal.loan);
    cy.continueStep();
    cy.fillStep2(personal.personal);
    cy.continueStep();
    cy.waitForStep('Verify your identity');

    cy.typeInto('pan', 'ABCDE1234F');
    cy.contains('PAN 4th character must indicate entity type (P for Individual, C for Company, etc.).').should('be.visible');
    cy.typeInto('pan', 'ABC');
    cy.contains('PAN must be 10 characters in the format AAAAA9999A.').should('be.visible');

    cy.typeInto('aadhaar', '234567890123');
    cy.contains('This Aadhaar number fails its checksum.').should('be.visible');
    cy.typeInto('aadhaar', '123456789012');
    cy.contains('Aadhaar numbers never start with 0 or 1.').should('be.visible');

    cy.fillStep3(personal.kyc);
    cy.get('[name="aadhaarConsent"]').uncheck({ force: true });
    cy.continueStep();
    cy.contains('Give your consent for Aadhaar-based verification to continue.').should('be.visible');
    cy.contains('h1', 'Verify your identity');
  });

  it('Journey 7 · Step 4: PIN lookup fills city and state; invalid and unknown PINs are explained', () => {
    cy.fillStep1(personal.loan);
    cy.continueStep();
    cy.fillStep2(personal.personal);
    cy.continueStep();
    cy.fillStep3(personal.kyc);
    cy.continueStep();
    cy.waitForStep('Where you live');

    cy.typeInto('current.pinCode', '012345');
    cy.contains('Indian PIN codes do not start with 0.').should('be.visible');
    cy.typeInto('current.pinCode', '999999');
    cy.contains('Not in our sample PIN directory').should('be.visible');
    cy.typeInto('current.pinCode', '560001');
    cy.get('[name="current.city"]').should('have.value', 'Bengaluru');
    cy.get('[name="current.state"]').should('have.value', 'Karnataka');
    cy.contains('Post office: Bengaluru G.P.O').should('be.visible');

    cy.continueStep();
    cy.contains('Enter the first line of your current address').should('be.visible');
    cy.get('[name="residenceType"]').select('rented');
    cy.continueStep();
    cy.contains('Enter the rent you pay each month.').should('be.visible');
  });

  it('Steps 5–8: income minimum, missing documents, signature and consents', () => {
    cy.fillStep1(personal.loan);
    cy.continueStep();
    cy.fillStep2(personal.personal);
    cy.continueStep();
    cy.fillStep3(personal.kyc);
    cy.continueStep();
    cy.fillStep4(personal.address);
    cy.continueStep();

    cy.waitForStep('Work and income');
    cy.continueStep();
    cy.contains('Choose how you earn your income.').should('be.visible');
    cy.fillStep5({ ...personal.employment, monthlySalary: '12000' });
    cy.continueStep();
    cy.contains('The minimum monthly salary for a loan is ₹15,000.').should('be.visible');
    cy.typeInto('monthlySalary', personal.employment.monthlySalary);
    cy.continueStep();

    cy.waitForStep('Documents and signature');
    cy.continueStep();
    cy.contains('Upload your Aadhaar card.').should('be.visible');
    cy.contains('Upload your salary slips.').should('be.visible');
    cy.contains('Sign the application.').should('be.visible');
    cy.uploadDocument('aadhaarCard', 'photo.jpg');
    cy.contains('Add the other side of your Aadhaar card', { timeout: 10000 }).should('be.visible');

    cy.uploadDocument('aadhaarCard', 'photo.jpg');
    cy.contains('Add the other side of your Aadhaar card').should('not.exist');
    cy.fillStep7({
      salarySlips: 'sample.pdf', bankStatements: 'sample.pdf', photograph: 'photo.jpg',
    }, personal.personal.fullName);
    cy.continueStep();
    cy.waitForStep('Review and submit');
    cy.get('[data-testid="submit-application"]').should('be.disabled')
      .and('have.attr', 'aria-describedby');
    cy.get('[data-testid="submit-panel"]').should('contain', 'Tick the 4 remaining consents.');
    cy.tickConsent(/true, complete and accurate/);
    cy.get('[data-testid="submit-panel"]').should('contain', 'Tick the 3 remaining consents.');
  });
});
