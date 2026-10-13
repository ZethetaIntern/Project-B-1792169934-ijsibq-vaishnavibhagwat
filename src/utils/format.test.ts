import { describe, expect, it } from 'vitest';
import { cn } from './cn';
import {
  formatBytes,
  formatCompactINR,
  formatDisplayDate,
  formatIndianDigits,
  formatIndianNumber,
  formatINR,
  formatPercent,
  formatTenure,
  maskSensitive,
  maskWithPrefix,
  parseIndianNumber,
} from './format';

describe('Indian number formatting', () => {
  it('groups digits in lakhs and crores, not millions', () => {
    expect(formatIndianNumber(1_050_000)).toBe('10,50,000');
    expect(formatIndianNumber(10_000_000)).toBe('1,00,00,000');
    expect(formatIndianNumber(999)).toBe('999');
  });

  it('prefixes the rupee symbol and supports paise', () => {
    expect(formatINR(250000)).toBe('₹2,50,000');
    expect(formatINR(1234.5, { decimals: true })).toBe('₹1,234.50');
  });

  it('returns an empty string for non-finite numbers', () => {
    expect(formatINR(Number.NaN)).toBe('');
    expect(formatIndianNumber(Infinity)).toBe('');
    expect(formatPercent(Number.NaN)).toBe('');
  });

  it('formats compact lakh and crore amounts', () => {
    expect(formatCompactINR(1_050_000)).toBe('₹10.5 L');
    expect(formatCompactINR(12_000_000)).toBe('₹1.2 Cr');
    expect(formatCompactINR(95_000)).toBe('₹95,000');
  });

  it('parses formatted input back to a number', () => {
    expect(parseIndianNumber('₹10,50,000')).toBe(1_050_000);
    expect(parseIndianNumber('abc')).toBeNull();
    expect(parseIndianNumber('')).toBeNull();
    expect(parseIndianNumber(42)).toBe(42);
    expect(parseIndianNumber(Number.NaN)).toBeNull();
  });

  it('formats digits while typing', () => {
    expect(formatIndianDigits('1050000')).toBe('10,50,000');
    expect(formatIndianDigits('')).toBe('');
  });
});

describe('formatTenure', () => {
  it.each([
    [12, '1 year'],
    [36, '3 years'],
    [18, '1 year 6 months'],
    [6, '6 months'],
    [1, '1 month'],
    [0, ''],
  ])('%i months → %s', (months, expected) => {
    expect(formatTenure(months)).toBe(expected);
  });
});

describe('formatBytes', () => {
  it('uses human-readable units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(20 * 1024 * 1024)).toBe('20 MB');
    expect(formatBytes(-1)).toBe('');
  });
});

describe('formatPercent', () => {
  it('formats ratios as percentages', () => {
    expect(formatPercent(0.4231)).toBe('42.3%');
    expect(formatPercent(0.5)).toBe('50%');
  });
});

describe('maskSensitive', () => {
  it('keeps only the last four characters visible', () => {
    expect(maskSensitive('ABCPE1234F')).toBe('••••••234F');
  });

  it('preserves separators such as Aadhaar spacing', () => {
    expect(maskSensitive('2345 6789 0123')).toBe('•••• •••• 0123');
  });

  it('handles short and empty values', () => {
    expect(maskSensitive('12')).toBe('12');
    expect(maskSensitive('')).toBe('');
  });
});

describe('maskWithPrefix', () => {
  it('replaces everything before the last four digits with a fixed prefix', () => {
    expect(maskWithPrefix('80,00,000')).toBe('••••0,000');
    expect(maskWithPrefix('2,10,000')).toBe('••••0,000');
    expect(maskWithPrefix('9,500')).toBe('9,500');
    expect(maskWithPrefix('')).toBe('');
  });
});

describe('formatDisplayDate', () => {
  it('formats ISO dates for India', () => {
    expect(formatDisplayDate('2026-10-13')).toBe('13 Oct 2026');
    expect(formatDisplayDate('')).toBe('');
    expect(formatDisplayDate('not-a-date')).toBe('');
  });
});

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', false, 'b', null, undefined, 0, 'c')).toBe('a b c');
  });
});
