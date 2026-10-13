import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../store/initialApplication';
import type { ApplicationData, PersonalDetails } from '../types/application';
import { buildStep2Schema } from './step2Schema';

const today = new Date(2026, 9, 13); // 13 Oct 2026

const validPerson: PersonalDetails = {
  fullName: 'Asha Verma',
  dateOfBirth: '1992-04-18',
  gender: 'female',
  maritalStatus: 'married',
  fatherName: 'Rakesh Verma',
  motherName: 'Sunita Verma',
  email: 'Asha.Verma@Example.com',
  emailVerified: false,
  mobile: '+91 98765 43210',
  mobileVerified: true,
  alternateMobile: '',
};

function parse(person: Partial<PersonalDetails>, tenureMonths: number | null = null) {
  const application: ApplicationData = createEmptyApplication();
  application.loan = { ...application.loan, loanType: 'home', tenureMonths };
  application.personal = { ...validPerson, ...person };
  return buildStep2Schema(application, today).safeParse(application.personal);
}

function errors(person: Partial<PersonalDetails>, tenureMonths: number | null = null) {
  const result = parse(person, tenureMonths);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

describe('step 2 schema', () => {
  it('accepts valid details and normalises email and mobile', () => {
    const result = parse({});
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ email: 'asha.verma@example.com', mobile: '9876543210' });
  });

  it('requires every mandatory field', () => {
    const empty = createEmptyApplication().personal;
    expect(Object.keys(errors(empty)).sort()).toEqual([
      'dateOfBirth', 'email', 'fatherName', 'fullName', 'gender', 'maritalStatus', 'mobile', 'motherName',
    ]);
  });

  it('accepts an applicant who turns 21 today and rejects one a day short', () => {
    expect(errors({ dateOfBirth: '2005-10-13' })).toEqual({});
    expect(errors({ dateOfBirth: '2005-10-14' }).dateOfBirth)
      .toBe('You must be at least 21 years old to apply. You are 20 today.');
  });

  it('rejects applicants over 65, future dates and impossible dates', () => {
    expect(errors({ dateOfBirth: '1960-10-12' }).dateOfBirth).toMatch(/65 or younger/);
    expect(errors({ dateOfBirth: '2027-01-01' }).dateOfBirth).toMatch(/cannot be in the future/);
    expect(errors({ dateOfBirth: '1990-02-30' }).dateOfBirth).toMatch(/real date/);
  });

  it('checks the date of birth against the Step 1 tenure (age at maturity ≤ 65)', () => {
    // Born 13 Oct 1981 → turns 65 on 13 Oct 2046 → at most 240 months.
    expect(errors({ dateOfBirth: '1981-10-13' }, 240)).toEqual({});
    expect(errors({ dateOfBirth: '1981-10-13' }, 300).dateOfBirth)
      .toBe('Repaying your Home Loan over 25 years would run past your 65th birthday. Shorten the tenure in Step 1 to 20 years or less.');
  });

  it('requires a verified primary mobile', () => {
    expect(errors({ mobileVerified: false }).mobile).toBe('Verify your mobile number with the one-time password.');
    expect(errors({ mobile: '5876543210' }).mobile).toBe('Indian mobile numbers start with 6, 7, 8 or 9.');
  });

  it('validates the optional alternate mobile and requires it to differ', () => {
    expect(errors({ alternateMobile: '9876543210' }).alternateMobile).toMatch(/must be different/);
    expect(errors({ alternateMobile: '12345' }).alternateMobile).toBe('Enter a 10-digit mobile number.');
    expect(errors({ alternateMobile: '8123456789' })).toEqual({});
  });

  it('gives specific messages for names and email', () => {
    expect(errors({ fullName: 'Asha <script>' }).fullName).toMatch(/only English letters/);
    expect(errors({ email: 'asha@example' }).email).toBe('Enter an email address like name@example.com.');
  });
});
