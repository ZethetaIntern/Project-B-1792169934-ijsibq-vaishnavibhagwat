import { describe, expect, it } from 'vitest';
import { createEmptyAddress, createEmptyApplication } from '../store/initialApplication';
import type { AddressDetails, PostalAddress } from '../types/application';
import { buildStep4Schema } from './step4Schema';

const home: PostalAddress = {
  line1: 'Flat 4B, Lotus Residency, MG Road',
  line2: '',
  pinCode: '560001',
  city: 'Bengaluru',
  state: 'Karnataka',
  postOffice: 'Bengaluru G.P.O',
};

const valid: AddressDetails = {
  ...createEmptyApplication().address,
  current: home,
  residenceType: 'owned',
  yearsAtCurrentAddress: 6,
  permanentSameAsCurrent: true,
};

function parse(address: Partial<AddressDetails>) {
  return buildStep4Schema().safeParse({ ...valid, ...address });
}

function errors(address: Partial<AddressDetails>) {
  const result = parse(address);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

describe('step 4 schema', () => {
  it('copies the current address when the permanent address is the same', () => {
    const result = parse({});
    expect(result.success).toBe(true);
    expect(result.data?.permanent).toEqual(home);
  });

  it('requires every current address field with specific messages', () => {
    expect(errors({ current: createEmptyAddress() })).toEqual({
      'current.line1': 'Enter the first line of your current address (house number and street).',
      'current.pinCode': 'Enter the 6-digit PIN code.',
      'current.city': 'Enter the city or town.',
      'current.state': 'Select the state or union territory.',
    });
  });

  it('flags a state that does not match the PIN code', () => {
    expect(errors({ current: { ...home, state: 'Kerala' } })['current.state'])
      .toBe('PIN code 560001 belongs to Karnataka. Choose Karnataka or check the PIN code.');
  });

  it('accepts manual city and state for PINs outside the sample directory', () => {
    expect(errors({ current: { ...home, pinCode: '560099', state: 'Karnataka' } })).toEqual({});
  });

  it('rejects markup and too-short lines', () => {
    expect(errors({ current: { ...home, line1: '<b>Flat</b>' } })['current.line1']).toMatch(/Remove symbols/);
    expect(errors({ current: { ...home, line1: 'A1' } })['current.line1']).toMatch(/at least 5 characters/);
  });

  it('requires rent only for rented homes and clears it otherwise', () => {
    expect(errors({ residenceType: 'rented' }).monthlyRent).toBe('Enter the rent you pay each month.');
    expect(parse({ residenceType: 'rented', monthlyRent: 18_000 }).data?.monthlyRent).toBe(18_000);
    expect(parse({ residenceType: 'owned', monthlyRent: 18_000 }).data?.monthlyRent).toBeNull();
  });

  it('requires a previous address under one year and drops it otherwise', () => {
    expect(errors({ yearsAtCurrentAddress: 0 })['previous.line1']).toMatch(/previous address/);
    const previous = { ...home, line1: '12 Lake View Road' };
    expect(parse({ yearsAtCurrentAddress: 0, previous }).data?.previous).toEqual(previous);
    expect(parse({ yearsAtCurrentAddress: 3, previous }).data?.previous)
      .toEqual(createEmptyAddress());
  });

  it('validates years at the current address', () => {
    expect(errors({ yearsAtCurrentAddress: null }).yearsAtCurrentAddress)
      .toMatch(/0 if less than a year/);
    expect(errors({ yearsAtCurrentAddress: 51 }).yearsAtCurrentAddress).toMatch(/between 0 and 50/);
  });

  it('requires a separate permanent address when not the same', () => {
    expect(errors({ permanentSameAsCurrent: false })['permanent.line1']).toMatch(/permanent address/);
  });

  it('requires a residence type', () => {
    expect(errors({ residenceType: '' }).residenceType).toBe('Tell us whether you own or rent your home.');
  });
});
