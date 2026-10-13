import { z } from 'zod';
import { STATES_AND_UNION_TERRITORIES } from '../constants/states';
import type { PostalAddress } from '../types/application';
import { findPinCode, validatePinCode } from '../utils/pinCodes';
import { fail, text } from './common';

/** Letters/digits in any script plus the punctuation addresses really use. */
const ADDRESS_TEXT = /^[\p{L}\p{N}\s,.\-/#()&':]+$/u;
const PLACE_NAME = /^[\p{L}\s.'-]+$/u;

export const addressShape = z.object({
  line1: text,
  line2: text,
  pinCode: z.string().transform((value) => value.replace(/\D/g, '')),
  city: text,
  state: z.string(),
  postOffice: text,
});

/**
 * Shared rules for every postal address in the application (current, previous,
 * permanent and office). `label` personalises messages, e.g. "your current address".
 */
export function checkAddress(
  ctx: z.RefinementCtx,
  path: string,
  address: PostalAddress,
  label: string,
): void {
  const at = (field: keyof PostalAddress) => [path, field];

  if (!address.line1) {
    fail(ctx, at('line1'), `Enter the first line of ${label} (house number and street).`);
  } else if (address.line1.length < 5) {
    fail(ctx, at('line1'), 'Add a little more detail — at least 5 characters, such as house number and street.');
  } else if (address.line1.length > 200) {
    fail(ctx, at('line1'), 'Keep this line to 200 characters or fewer.');
  } else if (!ADDRESS_TEXT.test(address.line1)) {
    fail(ctx, at('line1'), 'Remove symbols such as < > @ or emoji from the address.');
  }

  if (address.line2.length > 200) {
    fail(ctx, at('line2'), 'Keep this line to 200 characters or fewer.');
  } else if (address.line2 && !ADDRESS_TEXT.test(address.line2)) {
    fail(ctx, at('line2'), 'Remove symbols such as < > @ or emoji from the address.');
  }

  const pinProblem = address.pinCode ? validatePinCode(address.pinCode) : 'Enter the 6-digit PIN code.';
  if (pinProblem) fail(ctx, at('pinCode'), pinProblem);

  if (!address.city) {
    fail(ctx, at('city'), 'Enter the city or town.');
  } else if (address.city.length > 60 || !PLACE_NAME.test(address.city)) {
    fail(ctx, at('city'), 'Use letters, spaces and full stops only for the city (60 characters at most).');
  }

  if (!address.state) {
    fail(ctx, at('state'), 'Select the state or union territory.');
  } else if (!STATES_AND_UNION_TERRITORIES.includes(address.state)) {
    fail(ctx, at('state'), 'Choose a state or union territory from the list.');
  } else if (!pinProblem) {
    const record = findPinCode(address.pinCode);
    if (record && record.state !== address.state) {
      fail(
        ctx,
        at('state'),
        `PIN code ${address.pinCode} belongs to ${record.state}. Choose ${record.state} or check the PIN code.`,
      );
    }
  }
}
