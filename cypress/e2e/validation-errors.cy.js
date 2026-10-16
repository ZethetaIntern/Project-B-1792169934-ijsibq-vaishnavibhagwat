const isoDate = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

describe('Validation errors — one test per step', () => {
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

  it('Step 5: employment type, salary minimum and previous jobs that exceed total experience', () => {
    cy.resumeAt('employment', {
      edit: (data) => {
        Object.assign(data.employment, {
          employmentType: '', companyName: '', designation: '', monthlySalary: null, yearsOfExperience: null,
        });
      },
    });
    cy.waitForStep('Work and income');
    cy.continueStep();
    cy.contains('Choose how you earn your income.').should('be.visible');

    cy.contains('label', 'Salaried').click();
    cy.typeInto('companyName', 'Tata Consultancy Services');
    cy.typeInto('designation', 'Business Analyst');
    cy.typeInto('monthlySalary', '12000');
    cy.typeInto('yearsOfExperience', '2');
    cy.continueStep();
    cy.contains('The minimum monthly salary for a loan is ₹15,000.').should('be.visible');

    cy.contains('button', 'Add a previous employer').click();
    cy.continueStep();
    cy.contains('[role="group"]', 'Previous employer 1').within(() => {
      cy.contains('Enter the company name.').should('be.visible');
      cy.contains('Enter the job title you held.').should('be.visible');
    });
    cy.typeInto('previousEmployers.0.companyName', 'Wipro');
    cy.typeInto('previousEmployers.0.designation', 'Analyst');
    cy.typeInto('previousEmployers.0.years', '5');
    cy.contains('Your previous jobs add up to 5 years, more than the 2 years of total experience entered.')
      .should('be.visible');

    cy.typeInto('yearsOfExperience', '7');
    cy.typeInto('monthlySalary', '85000');
    cy.contains('Your previous jobs add up to').should('not.exist');
    cy.continueStep();
    cy.waitForStep('Documents and signature');
  });

  it('Step 6: every co-applicant field, and a co-applicant who is really the applicant', () => {
    cy.resumeAt('coApplicant', {
      loanType: 'home',
      edit: (data) => {
        Object.assign(data.coApplicant, {
          fullName: '', relationship: '', pan: '', panVerified: false, monthlyIncome: null, consent: false, signature: '',
        });
      },
    });
    cy.waitForStep('Add a co-applicant');
    cy.continueStep();
    cy.contains("Enter your co-applicant's full name.").should('be.visible');
    // Step 2 → Step 6: the seeded applicant is married, so Spouse is pre-selected.
    cy.get('[name="relationship"]').should('have.value', 'spouse');
    cy.contains("Enter your co-applicant's PAN.").should('be.visible');
    cy.contains("Enter your co-applicant's monthly income (0 if they have none).").should('be.visible');
    cy.contains('Your co-applicant must give their consent to continue.').should('be.visible');
    cy.contains('Your co-applicant needs to sign.').should('be.visible');

    // The seeded applicant is Asha Verma, PAN ABCPE1234F.
    cy.typeInto('fullName', 'Asha Verma');
    cy.contains('Your co-applicant must be a different person from you.').should('be.visible');
    cy.typeInto('pan', 'ABCPE1234F');
    cy.contains('Your co-applicant needs their own PAN — this one matches yours.').should('be.visible');

    cy.typeInto('fullName', 'Ravi Verma');
    cy.contains('must be a different person').should('not.exist');
    cy.contains('h1', 'Add a co-applicant');
  });

  it('Step 7: missing documents and signature, a wrong file type and a one-sided Aadhaar', () => {
    cy.fixture('valid-personal-loan.json').then(({ documents, personal: person }) => {
      cy.resumeAt('documents', {
        edit: (data) => {
          Object.assign(data.documents, { files: {}, signature: '', signatureMethod: '' });
        },
      });
      cy.waitForStep('Documents and signature');
      cy.continueStep();
      cy.contains('Upload your Aadhaar card.').should('be.visible');
      cy.contains('Upload your salary slips.').should('be.visible');
      cy.contains('Sign the application.').should('be.visible');

      cy.uploadDocument('salarySlips', 'notes.txt');
      cy.contains('“notes.txt” is not a PDF file. Choose a PDF instead.').should('be.visible');

      cy.uploadDocument('aadhaarCard', 'photo.jpg');
      cy.contains('Add the other side of your Aadhaar card', { timeout: 10000 }).should('be.visible');
      cy.uploadDocument('aadhaarCard', 'photo.jpg');
      cy.contains('Add the other side of your Aadhaar card').should('not.exist');

      const { aadhaarCard, ...rest } = documents;
      cy.fillStep7(rest, person.fullName);
      cy.continueStep();
      cy.waitForStep('Review and submit');
    });
  });

  it('Step 8: submit stays disabled until every consent and the high-EMI warning are acknowledged', () => {
    // ₹16,000 a month against a ₹3 lakh, 36-month loan: the EMI is over half the income.
    cy.resumeAt('review', {
      edit: (data) => {
        Object.assign(data.employment, { monthlySalary: 16_000 });
      },
    });
    cy.waitForStep('Review and submit');
    cy.get('[data-testid="submit-application"]').should('be.disabled')
      .and('have.attr', 'aria-describedby');
    cy.get('[data-testid="submit-panel"]').should('contain', 'Tick the 4 remaining consents.')
      .and('contain', 'Acknowledge the high EMI warning.');

    cy.tickConsent(/true, complete and accurate/);
    cy.get('[data-testid="submit-panel"]').should('contain', 'Tick the 3 remaining consents.');
    cy.fillStep8();
    cy.get('[data-testid="submit-panel"]').should('not.contain', 'remaining consent');
    cy.get('[data-testid="submit-application"]').should('be.disabled');

    cy.tickConsent(/more than half of my monthly income/);
    cy.get('[data-testid="submit-application"]').should('be.enabled');
  });
});
