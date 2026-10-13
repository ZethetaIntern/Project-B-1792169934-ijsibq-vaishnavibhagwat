/**
 * Formatting helpers for the Indian numbering system (lakh / crore grouping).
 * `Intl.NumberFormat('en-IN')` groups digits as 10,50,000 rather than 1,050,000.
 */

const INDIAN_INTEGER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const INDIAN_DECIMAL = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const RUPEE = '₹';

/** 1050000 → "10,50,000" */
export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  return INDIAN_INTEGER.format(Math.round(value));
}

/** 1050000 → "₹10,50,000"; with `decimals: true` → "₹10,50,000.00" */
export function formatINR(value: number, options: { decimals?: boolean } = {}): string {
  if (!Number.isFinite(value)) return '';
  const formatted = options.decimals
    ? INDIAN_DECIMAL.format(value)
    : INDIAN_INTEGER.format(Math.round(value));
  return `${RUPEE}${formatted}`;
}

/** 1050000 → "₹10.5 L", 12000000 → "₹1.2 Cr", 95000 → "₹95,000" */
export function formatCompactINR(value: number): string {
  if (!Number.isFinite(value)) return '';
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');
  if (Math.abs(value) >= 1_00_00_000) return `${RUPEE}${trim(value / 1_00_00_000)} Cr`;
  if (Math.abs(value) >= 1_00_000) return `${RUPEE}${trim(value / 1_00_000)} L`;
  return formatINR(value);
}

/** "₹10,50,000" / "10,50,000" / "1050000" → 1050000; returns null when no digits. */
export function parseIndianNumber(input: string | number | null | undefined): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, '');
  if (!digits) return null;
  return Number(digits);
}

/** Formats raw keyboard input as Indian-grouped digits while typing ("1050000" → "10,50,000"). */
export function formatIndianDigits(input: string): string {
  const parsed = parseIndianNumber(input);
  return parsed === null ? '' : formatIndianNumber(parsed);
}

/** 36 → "3 years", 18 → "1 year 6 months", 6 → "6 months" */
export function formatTenure(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return '';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearPart = years ? `${years} ${years === 1 ? 'year' : 'years'}` : '';
  const monthPart = rest ? `${rest} ${rest === 1 ? 'month' : 'months'}` : '';
  return [yearPart, monthPart].filter(Boolean).join(' ');
}

/** 1536 → "1.5 KB", 5242880 → "5 MB" */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1).replace(/\.0$/, '')} ${units[unitIndex]}`;
}

/** 0.4231 → "42.3%" */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  if (!Number.isFinite(ratio)) return '';
  return `${(ratio * 100).toFixed(fractionDigits).replace(/\.0+$/, '')}%`;
}

/**
 * Masks sensitive values for display, keeping only the last `visible` characters.
 * "ABCPE1234F" → "••••••234F". Spaces and separators are preserved in place.
 */
export function maskSensitive(value: string, visible = 4, maskChar = '•'): string {
  if (!value) return '';
  const significant = value.replace(/[\s,]/g, '').length;
  let toMask = Math.max(significant - visible, 0);
  return value
    .split('')
    .map((char) => {
      if (/[\s,]/.test(char)) return char;
      if (toMask > 0) {
        toMask -= 1;
        return maskChar;
      }
      return char;
    })
    .join('');
}

/** "2026-10-13" → "13 Oct 2026" */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
