import { describe, expect, it } from 'vitest';
import { STATES_AND_UNION_TERRITORIES } from '../constants/states';
import pinCodeData from './pinCodeData.json';
import {
  findPinCode, lookupPinCode, PIN_DIRECTORY_SIZE, validatePinCode,
} from './pinCodes';

describe('PIN code directory', () => {
  it('holds at least 100 unique PIN codes', () => {
    expect(pinCodeData.length).toBeGreaterThanOrEqual(100);
    expect(PIN_DIRECTORY_SIZE).toBe(pinCodeData.length);
  });

  it('covers all 28 states and 8 union territories with valid names', () => {
    const covered = new Set(pinCodeData.map((record) => record.state));
    expect([...covered].sort()).toEqual([...STATES_AND_UNION_TERRITORIES].sort());
  });

  it('finds a known PIN synchronously', () => {
    expect(findPinCode('560001')).toEqual({
      pin: '560001', postOffice: 'Bengaluru G.P.O', city: 'Bengaluru', state: 'Karnataka',
    });
    expect(findPinCode('999999')).toBeUndefined();
  });

  it('simulates an asynchronous lookup', async () => {
    await expect(lookupPinCode('110001', 0)).resolves.toMatchObject({ city: 'New Delhi', state: 'Delhi' });
    await expect(lookupPinCode('110099', 0)).resolves.toBeNull();
  });
});

describe('validatePinCode', () => {
  it.each([
    ['560001', null],
    ['56000', 'PIN codes are 6 digits long.'],
    ['056001', 'Indian PIN codes do not start with 0.'],
    ['56A001', 'Use digits only for the PIN code.'],
  ])('%s → %s', (pin, message) => {
    expect(validatePinCode(pin)).toBe(message);
  });
});
