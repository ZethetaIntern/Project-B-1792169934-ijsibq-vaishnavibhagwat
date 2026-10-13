import { z } from 'zod';
import { createEmptyAddress } from '../store/initialApplication';
import { formatINR } from '../utils/format';
import { addressShape, checkAddress } from './addressSchema';
import {
  choice, fail, optionalNumber, uploadedDocument,
} from './common';

export const RESIDENCE_TYPES = ['owned', 'rented', 'company', 'family'] as const;
export const MAX_MONTHLY_RENT = 5_00_000;

/**
 * Step 4 — addresses.
 * - Rented → monthly rent required (it also feeds the affordability estimate).
 * - Under one year at the current address → previous address required.
 * - "Same as current" → the permanent address is copied from the current one.
 * Conditional sections that do not apply are cleared (data minimisation).
 */
export function buildStep4Schema() {
  return z.object({
    current: addressShape,
    residenceType: choice,
    monthlyRent: optionalNumber,
    yearsAtCurrentAddress: optionalNumber,
    previous: addressShape,
    permanentSameAsCurrent: z.boolean(),
    permanent: addressShape,
    addressProof: z.array(uploadedDocument),
  }).superRefine((address, ctx) => {
    checkAddress(ctx, 'current', address.current, 'your current address');

    if (!(RESIDENCE_TYPES as readonly string[]).includes(address.residenceType)) {
      fail(ctx, ['residenceType'], 'Tell us whether you own or rent your home.');
    }

    if (address.residenceType === 'rented') {
      if (address.monthlyRent === null || address.monthlyRent <= 0) {
        fail(ctx, ['monthlyRent'], 'Enter the rent you pay each month.');
      } else if (address.monthlyRent > MAX_MONTHLY_RENT) {
        fail(ctx, ['monthlyRent'], `Monthly rent above ${formatINR(MAX_MONTHLY_RENT)} looks unusual. Check the amount.`);
      }
    }

    const years = address.yearsAtCurrentAddress;
    if (years === null) {
      fail(ctx, ['yearsAtCurrentAddress'], 'Enter how many years you have lived here (0 if less than a year).');
    } else if (!Number.isInteger(years) || years < 0 || years > 50) {
      fail(ctx, ['yearsAtCurrentAddress'], 'Enter a whole number of years between 0 and 50.');
    } else if (years < 1) {
      checkAddress(ctx, 'previous', address.previous, 'your previous address');
    }

    if (!address.permanentSameAsCurrent) {
      checkAddress(ctx, 'permanent', address.permanent, 'your permanent address');
    }
  }).transform((address) => ({
    ...address,
    monthlyRent: address.residenceType === 'rented' ? address.monthlyRent : null,
    previous: (address.yearsAtCurrentAddress ?? 1) < 1 ? address.previous : createEmptyAddress(),
    permanent: address.permanentSameAsCurrent ? { ...address.current } : address.permanent,
  }));
}
