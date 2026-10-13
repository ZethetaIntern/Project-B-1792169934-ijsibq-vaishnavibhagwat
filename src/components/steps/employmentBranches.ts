import { createEmptyApplication } from '../../store/initialApplication';
import type { EmploymentDetails, EmploymentType } from '../../types/application';

type BranchField = Exclude<keyof EmploymentDetails, 'employmentType' | 'yearsOfExperience'>;

const SALARIED: readonly BranchField[] = ['companyName', 'designation', 'monthlySalary'];
const BUSINESS: readonly BranchField[] = [
  'businessName', 'businessType', 'annualTurnover', 'yearsInBusiness', 'monthlyIncome', 'officeAddress',
];

/** Fields that belong to an employment type (beyond the shared years of experience). */
export function branchFields(type: EmploymentType | ''): readonly BranchField[] {
  if (type === 'salaried') return SALARIED;
  if (type === 'selfEmployed') return BUSINESS;
  if (type === 'businessOwner') return [...BUSINESS, 'gstNumber'];
  return [];
}

/** Fields that would be discarded by switching from `from` to `to`. */
export function fieldsLostOnSwitch(from: EmploymentType | '', to: EmploymentType): BranchField[] {
  const kept = new Set(branchFields(to));
  return branchFields(from).filter((field) => !kept.has(field));
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'object') return Object.values(value).some(hasValue);
  return true;
}

export function hasDataToLose(
  values: EmploymentDetails,
  from: EmploymentType | '',
  to: EmploymentType,
): boolean {
  return fieldsLostOnSwitch(from, to).some((field) => hasValue(values[field]));
}

/** Empty values for the given fields, to reset them in the form. */
export function emptyValues(fields: readonly BranchField[]): Partial<EmploymentDetails> {
  const empty = createEmptyApplication().employment;
  return Object.fromEntries(fields.map((field) => [field, empty[field]]));
}

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  salaried: 'Salaried',
  selfEmployed: 'Self-employed',
  businessOwner: 'Business owner',
};
