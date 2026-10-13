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
