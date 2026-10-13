import { describe, expect, it } from 'vitest';
import {
  allowedPanEntities,
  isVerhoeffValid,
  validateAadhaar,
  validatePan,
  validatePassport,
  validateVoterId,
  verhoeffCheckDigit,
} from './validators';

describe('validatePan', () => {
  it('accepts an individual PAN for personal and home loans', () => {
    expect(validatePan('ABCPE1234F', allowedPanEntities('personal'))).toBeNull();
  });

  it('explains each structural problem', () => {
    expect(validatePan('ABCPE1234')).toBe('PAN must be 10 characters in the format AAAAA9999A.');
    expect(validatePan('AB1PE1234F')).toMatch(/first five characters of a PAN are letters/);
    expect(validatePan('ABCPEX234F')).toMatch(/Characters 6 to 9/);
    expect(validatePan('ABCPE12345')).toMatch(/last character of a PAN is a letter/);
  });

  it('rejects an unknown entity type with the specific message (QA E3.4)', () => {
    expect(validatePan('ABCDE1234F')).toBe(
      'PAN 4th character must indicate entity type (P for Individual, C for Company, etc.).',
    );
  });

  it('restricts entity types by loan type', () => {
    expect(validatePan('ABCCE1234F', allowedPanEntities('home'))).toMatch(/"C" is a Company PAN/);
    expect(validatePan('ABCCE1234F', allowedPanEntities('business'))).toBeNull();
    expect(validatePan('ABCFE1234F', allowedPanEntities('business'))).toBeNull();
    expect(validatePan('ABCTE1234F', allowedPanEntities('business'))).toMatch(/Trust PAN/);
  });
});

describe('Verhoeff checksum', () => {
  it('validates the textbook example (236 has check digit 3)', () => {
    expect(verhoeffCheckDigit('236')).toBe(3);
    expect(isVerhoeffValid('2363')).toBe(true);
    expect(isVerhoeffValid('2364')).toBe(false);
  });

  it('round-trips generated check digits', () => {
    ['23456789012', '98765432101', '50000000000', '71234567890'].forEach((body) => {
      expect(isVerhoeffValid(`${body}${verhoeffCheckDigit(body)}`)).toBe(true);
    });
  });

  it('catches single-digit errors and adjacent transpositions', () => {
    const body = '23456789012';
    const valid = `${body}${verhoeffCheckDigit(body)}`;
    const typo = `${valid.slice(0, 5)}${(Number(valid[5]) + 1) % 10}${valid.slice(6)}`;
    const swapped = `${valid.slice(0, 3)}${valid[4]}${valid[3]}${valid.slice(5)}`;
    expect(isVerhoeffValid(typo)).toBe(false);
    expect(isVerhoeffValid(swapped)).toBe(false);
    expect(isVerhoeffValid('12ab')).toBe(false);
  });
});

describe('validateAadhaar', () => {
  const body = '23456789012';
  const valid = `${body}${verhoeffCheckDigit(body)}`;

  it('accepts a 12-digit number with a valid checksum', () => {
    expect(validateAadhaar(valid)).toBeNull();
  });

  it('rejects wrong length, leading 0/1 and bad checksums', () => {
    expect(validateAadhaar('23456789')).toBe('Aadhaar must be exactly 12 digits.');
    expect(validateAadhaar(`1${valid.slice(1)}`)).toMatch(/never start with 0 or 1/);
    const bad = `${body}${(verhoeffCheckDigit(body) + 1) % 10}`;
    expect(validateAadhaar(bad)).toMatch(/fails its checksum/);
  });
});

describe('optional identity documents', () => {
  it('validates Voter ID (EPIC) and passport formats', () => {
    expect(validateVoterId('ABC1234567')).toBeNull();
    expect(validateVoterId('AB12345678')).toMatch(/3 letters followed by 7 digits/);
    expect(validatePassport('K1234567')).toBeNull();
    expect(validatePassport('K123456')).toMatch(/1 letter followed by 7 digits/);
  });
});
