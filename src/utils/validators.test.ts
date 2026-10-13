import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidIndianMobile,
  normalizeIndianMobile,
  validateIndianMobile,
  validatePersonName,
} from './validators';

describe('validatePersonName', () => {
  it('accepts names as printed on a PAN card', () => {
    expect(validatePersonName('Asha Verma')).toBeNull();
    expect(validatePersonName('R. K. Narayan')).toBeNull();
  });

  it('rejects digits, symbols and non-Latin scripts with a specific message', () => {
    expect(validatePersonName('Asha2')).toMatch(/only English letters/);
    expect(validatePersonName('Asha@Verma')).toMatch(/only English letters/);
    expect(validatePersonName('आशा वर्मा')).toMatch(/only English letters/);
    expect(validatePersonName('.Asha')).toMatch(/only English letters/);
  });

  it('enforces 2–100 characters', () => {
    expect(validatePersonName('A', "father's name")).toBe("Enter at least 2 characters for the father's name.");
    expect(validatePersonName('A'.repeat(101))).toMatch(/100 characters or fewer/);
    expect(validatePersonName('A'.repeat(100))).toBeNull();
  });
});

describe('isValidEmail', () => {
  it.each(['asha@example.com', 'a.b+loans@mail.co.in', 'x_y@sub-domain.example.org'])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(['asha@', 'asha.example.com', 'asha@example', 'a sha@example.com', 'asha@-example.com', 'asha@example.c'])(
    'rejects %s',
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});

describe('Indian mobile numbers', () => {
  it('requires 10 digits starting with 6–9', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('6000000000')).toBe(true);
    expect(isValidIndianMobile('5876543210')).toBe(false);
    expect(isValidIndianMobile('987654321')).toBe(false);
  });

  it('explains what is wrong', () => {
    expect(validateIndianMobile('98765')).toBe('Enter a 10-digit mobile number.');
    expect(validateIndianMobile('5876543210')).toBe('Indian mobile numbers start with 6, 7, 8 or 9.');
    expect(validateIndianMobile('98765abcde')).toBe('Use digits only for the mobile number.');
    expect(validateIndianMobile('9876543210')).toBeNull();
  });

  it('normalises pasted numbers', () => {
    expect(normalizeIndianMobile('+91 98765 43210')).toBe('9876543210');
    expect(normalizeIndianMobile('09876543210')).toBe('9876543210');
    expect(normalizeIndianMobile('98765-43210')).toBe('9876543210');
  });
});
