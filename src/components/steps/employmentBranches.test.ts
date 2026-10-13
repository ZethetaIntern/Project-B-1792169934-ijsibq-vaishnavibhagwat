import { describe, expect, it } from 'vitest';
import { createEmptyApplication } from '../../store/initialApplication';
import {
  branchFields, emptyValues, fieldsLostOnSwitch, hasDataToLose,
} from './employmentBranches';

const empty = createEmptyApplication().employment;

describe('employment branch switching', () => {
  it('lists the fields owned by each employment type', () => {
    expect(branchFields('salaried')).toEqual(['companyName', 'designation', 'monthlySalary']);
    expect(branchFields('businessOwner')).toContain('gstNumber');
    expect(branchFields('selfEmployed')).not.toContain('gstNumber');
    expect(branchFields('')).toEqual([]);
  });

  it('only discards fields the new type does not use', () => {
    expect(fieldsLostOnSwitch('salaried', 'selfEmployed')).toEqual(['companyName', 'designation', 'monthlySalary']);
    expect(fieldsLostOnSwitch('businessOwner', 'selfEmployed')).toEqual(['gstNumber']);
    expect(fieldsLostOnSwitch('selfEmployed', 'businessOwner')).toEqual([]);
  });

  it('detects whether switching would throw away entered data', () => {
    const salaried = { ...empty, employmentType: 'salaried' as const, companyName: 'Infosys' };
    expect(hasDataToLose(salaried, 'salaried', 'selfEmployed')).toBe(true);
    expect(hasDataToLose(empty, 'salaried', 'selfEmployed')).toBe(false);
    const withOffice = { ...empty, officeAddress: { ...empty.officeAddress, pinCode: '560001' } };
    expect(hasDataToLose(withOffice, 'selfEmployed', 'salaried')).toBe(true);
  });

  it('produces empty values for cleared fields', () => {
    expect(emptyValues(['companyName', 'monthlySalary'])).toEqual({ companyName: '', monthlySalary: null });
  });
});
