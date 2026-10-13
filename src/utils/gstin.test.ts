import { describe, expect, it } from 'vitest';
import { gstinCheckCharacter, validateGstin } from './validators';

const withCheck = (first14: string) => `${first14}${gstinCheckCharacter(first14)}`;

describe('validateGstin', () => {
  it('accepts a well-formed GSTIN with the correct check character', () => {
    expect(validateGstin(withCheck('29ABCPE1234F1Z'))).toBeNull();
    expect(validateGstin(withCheck('07AAACL1234C2Z'))).toBeNull();
  });

  it('accepts the widely published sample GSTIN 27AAPFU0939F1ZV', () => {
    expect(gstinCheckCharacter('27AAPFU0939F1Z')).toBe('V');
    expect(validateGstin('27AAPFU0939F1ZV')).toBeNull();
  });

  it('explains each structural problem', () => {
    expect(validateGstin('29ABCPE1234F1Z')).toMatch(/15 characters long/);
    expect(validateGstin('29abcpe1234f1z5')).toMatch(/only capital letters and digits/);
    expect(validateGstin(withCheck('45ABCPE1234F1Z'))).toMatch(/state code from 01 to 38/);
    expect(validateGstin(withCheck('29ABCP11234F1Z'))).toMatch(/business PAN/);
    expect(validateGstin(withCheck('29ABCPE1234F0Z'))).toMatch(/13th character/);
    expect(validateGstin(withCheck('29ABCPE1234F1Y'))).toMatch(/always the letter Z/);
  });

  it('catches a single mistyped character through the checksum', () => {
    const valid = withCheck('29ABCPE1234F1Z');
    const wrongCheck = `${valid.slice(0, 14)}${valid[14] === 'A' ? 'B' : 'A'}`;
    expect(validateGstin(wrongCheck)).toMatch(/fails its checksum/);
    const typo = `${valid.slice(0, 8)}9${valid.slice(9)}`;
    expect(validateGstin(typo)).toMatch(/fails its checksum/);
  });
});
