import type { Gender, MaritalStatus, ResidenceType } from '../types/application';

/** Display labels shared by the step forms and the review page. */
export const GENDER_LABELS: Readonly<Record<Gender, string>> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

export const MARITAL_STATUS_LABELS: Readonly<Record<MaritalStatus, string>> = {
  single: 'Single',
  married: 'Married',
  divorced: 'Divorced',
  widowed: 'Widowed',
};

export const RESIDENCE_LABELS: Readonly<Record<ResidenceType, string>> = {
  owned: 'Owned by me',
  rented: 'Rented',
  company: 'Provided by employer',
  family: 'Owned by family',
};

/** `{ value, label }` options for a select or radio group, in declaration order. */
export function toOptions<T extends string>(labels: Readonly<Record<T, string>>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}
