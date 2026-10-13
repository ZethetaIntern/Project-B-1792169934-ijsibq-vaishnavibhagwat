/**
 * Field validators shared by the step schemas. Each returns `null` when valid or a
 * specific, actionable message (WCAG 3.3.3 — error suggestion) when not.
 */

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;

/** Names as printed on a PAN card: English letters, spaces and full stops. */
const PERSON_NAME = /^[A-Za-z][A-Za-z .]*$/;

/** Pragmatic email check: local@domain.tld, no spaces, TLD of 2+ letters. */
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

/** Indian mobile numbers: 10 digits starting with 6, 7, 8 or 9. */
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export function validatePersonName(value: string, label = 'name'): string | null {
  if (value.length < NAME_MIN_LENGTH) return `Enter at least ${NAME_MIN_LENGTH} characters for the ${label}.`;
  if (value.length > NAME_MAX_LENGTH) return `Use ${NAME_MAX_LENGTH} characters or fewer for the ${label}.`;
  if (!PERSON_NAME.test(value)) {
    return `Use only English letters, spaces and full stops in the ${label}, as on the PAN card.`;
  }
  return null;
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL.test(value);
}

/** Strips spaces, dashes, a +91 / 91 country code or a leading 0 from pasted numbers. */
export function normalizeIndianMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidIndianMobile(value: string): boolean {
  return INDIAN_MOBILE.test(value);
}

export function validateIndianMobile(value: string): string | null {
  if (!/^\d+$/.test(value)) return 'Use digits only for the mobile number.';
  if (value.length !== 10) return 'Enter a 10-digit mobile number.';
  if (!isValidIndianMobile(value)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
  return null;
}

/* ------------------------------------------------------------------ PAN */

/** 4th character of a PAN → holder type (Income Tax Department convention). */
export const PAN_ENTITY_TYPES: Readonly<Record<string, string>> = {
  P: 'Individual',
  C: 'Company',
  H: 'Hindu Undivided Family',
  A: 'Association of Persons',
  B: 'Body of Individuals',
  G: 'Government agency',
  J: 'Artificial Juridical Person',
  L: 'Local Authority',
  F: 'Firm or LLP',
  T: 'Trust',
};

/** Individual PANs for Personal and Home Loans; Business Loans also accept company/firm PANs. */
export function allowedPanEntities(loanType: string): string[] {
  return loanType === 'business' ? ['P', 'C', 'F'] : ['P'];
}

export function validatePan(
  value: string,
  allowedEntities: readonly string[] = ['P'],
): string | null {
  if (value.length !== 10) return 'PAN must be 10 characters in the format AAAAA9999A.';
  if (!/^[A-Z]{5}/.test(value)) return 'The first five characters of a PAN are letters, e.g. ABCPE1234F.';
  if (!/^[A-Z]{5}\d{4}/.test(value)) return 'Characters 6 to 9 of a PAN are digits, e.g. ABCPE1234F.';
  if (!/[A-Z]$/.test(value)) return 'The last character of a PAN is a letter, e.g. ABCPE1234F.';
  const entity = value[3];
  if (!PAN_ENTITY_TYPES[entity]) {
    return 'PAN 4th character must indicate entity type (P for Individual, C for Company, etc.).';
  }
  if (!allowedEntities.includes(entity)) {
    const accepted = allowedEntities.map((code) => `${code} (${PAN_ENTITY_TYPES[code]})`).join(', ');
    return `This loan needs a PAN whose 4th character is ${accepted}. "${entity}" is a ${PAN_ENTITY_TYPES[entity]} PAN.`;
  }
  return null;
}

/* -------------------------------------------------------------- Aadhaar */

/** Verhoeff multiplication table (dihedral group D5). */
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

/** Verhoeff permutation table, applied by digit position. */
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** Verhoeff inverse table. */
const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function verhoeffChecksum(digits: string, offset: number): number {
  return digits
    .split('')
    .reverse()
    .reduce((c, digit, index) => VERHOEFF_D[c][VERHOEFF_P[(index + offset) % 8][Number(digit)]], 0);
}

/** True when the full number (check digit included) has a Verhoeff checksum of 0. */
export function isVerhoeffValid(digits: string): boolean {
  return /^\d+$/.test(digits) && verhoeffChecksum(digits, 0) === 0;
}

/** Check digit to append to `digits` (used to create synthetic demo Aadhaar numbers). */
export function verhoeffCheckDigit(digits: string): number {
  return VERHOEFF_INV[verhoeffChecksum(digits, 1)];
}

export function validateAadhaar(digits: string): string | null {
  if (!/^\d{12}$/.test(digits)) return 'Aadhaar must be exactly 12 digits.';
  if (/^[01]/.test(digits)) return 'Aadhaar numbers never start with 0 or 1. Check the first digit.';
  if (!isVerhoeffValid(digits)) {
    return 'This Aadhaar number fails its checksum. Check for a mistyped or swapped digit.';
  }
  return null;
}

/* ---------------------------------------------------------------- GSTIN */

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * GSTIN check character: weights alternate 1, 2 over the first 14 characters
 * (base 36); each product contributes quotient + remainder of division by 36.
 */
export function gstinCheckCharacter(first14: string): string {
  const sum = first14.split('').reduce((total, char, index) => {
    const product = GSTIN_CHARSET.indexOf(char) * (index % 2 === 0 ? 1 : 2);
    return total + Math.floor(product / 36) + (product % 36);
  }, 0);
  return GSTIN_CHARSET[(36 - (sum % 36)) % 36];
}

/** 15 characters: state code (2) + PAN (10) + registration no. (1) + "Z" + checksum (1). */
export function validateGstin(value: string): string | null {
  if (value.length !== 15) return 'A GSTIN is 15 characters long, e.g. 29ABCPE1234F1Z5.';
  if (!/^[0-9A-Z]+$/.test(value)) return 'A GSTIN contains only capital letters and digits.';
  const stateCode = Number(value.slice(0, 2));
  if (!/^\d{2}/.test(value) || !((stateCode >= 1 && stateCode <= 38) || stateCode === 97)) {
    return 'The first two digits of a GSTIN are a state code from 01 to 38.';
  }
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(value.slice(2, 12))) {
    return 'Characters 3 to 12 of a GSTIN must be the business PAN, e.g. ABCPE1234F.';
  }
  if (!/^[1-9A-Z]$/.test(value[12])) {
    return 'The 13th character of a GSTIN is the registration number (1–9 or A–Z).';
  }
  if (value[13] !== 'Z') return 'The 14th character of a GSTIN is always the letter Z.';
  if (gstinCheckCharacter(value.slice(0, 14)) !== value[14]) {
    return 'This GSTIN fails its checksum. Check for a mistyped character.';
  }
  return null;
}

/* ------------------------------------------------ Optional ID documents */

export function validateVoterId(value: string): string | null {
  return /^[A-Z]{3}\d{7}$/.test(value)
    ? null
    : 'A Voter ID (EPIC) number is 3 letters followed by 7 digits, e.g. ABC1234567.';
}

export function validatePassport(value: string): string | null {
  return /^[A-Z]\d{7}$/.test(value)
    ? null
    : 'An Indian passport number is 1 letter followed by 7 digits, e.g. K1234567.';
}
