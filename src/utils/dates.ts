/**
 * Calendar helpers. ISO dates from `<input type="date">` are parsed as *local*
 * calendar days — `new Date('2004-10-13')` would be UTC midnight and can shift a
 * birthday by a day in Indian Standard Time.
 */

export function parseIsoDate(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  // Reject roll-overs such as 2023-02-30.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Completed years of age on `today` (a birthday today counts). */
export function calculateAge(isoDate: string, today: Date = new Date()): number | null {
  const birth = parseIsoDate(isoDate);
  if (!birth) return null;
  const now = startOfDay(today);
  let age = now.getFullYear() - birth.getFullYear();
  const birthdayPassed = now.getMonth() > birth.getMonth()
    || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return age;
}

/** The date someone born on `isoDate` turns `years` old (29 Feb → 28 Feb in non-leap years). */
export function dateOfAge(isoDate: string, years: number): Date | null {
  const birth = parseIsoDate(isoDate);
  if (!birth) return null;
  const target = new Date(birth.getFullYear() + years, birth.getMonth(), 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(birth.getDate(), lastDay));
  return target;
}

/**
 * Whole months from `today` until the person turns `years` old — the longest
 * tenure that keeps "age at loan maturity ≤ 65".
 */
export function monthsUntilAge(
  isoDate: string,
  years: number,
  today: Date = new Date(),
): number | null {
  const target = dateOfAge(isoDate, years);
  if (!target) return null;
  const now = startOfDay(today);
  const yearGap = target.getFullYear() - now.getFullYear();
  let months = yearGap * 12 + (target.getMonth() - now.getMonth());
  if (target.getDate() < now.getDate()) months -= 1;
  return Math.max(months, 0);
}

/** The date `years` ago today, as an ISO string — handy for date input min/max. */
export function isoDateYearsAgo(years: number, today: Date = new Date()): string {
  const date = new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
  return toIsoDate(date);
}
