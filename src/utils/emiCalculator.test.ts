import { describe, expect, it } from 'vitest';
import {
  calculateAge, dateOfAge, isoDateYearsAgo, monthsUntilAge, parseIsoDate, toIsoDate,
} from './dates';
import {
  assessAffordability,
  calculateApr,
  calculateEmi,
  calculateProcessingFee,
  estimateForLoan,
  estimateLoan,
  maxPrincipalForEmi,
} from './emiCalculator';

describe('calculateEmi', () => {
  it('matches the standard reducing-balance formula', () => {
    // ₹5,00,000 at 10.5% for 36 months — a commonly quoted reference value.
    expect(calculateEmi(5_00_000, 10.5, 36)).toBeCloseTo(16251.1, 0);
    // ₹50,00,000 home loan at 8.5% for 20 years.
    expect(Math.round(calculateEmi(50_00_000, 8.5, 240))).toBe(43391);
  });

  it('handles a zero interest rate without dividing by zero', () => {
    expect(calculateEmi(1_20_000, 0, 12)).toBe(10_000);
  });

  it('returns 0 for invalid inputs', () => {
    expect(calculateEmi(0, 10, 12)).toBe(0);
    expect(calculateEmi(1_00_000, 10, 0)).toBe(0);
    expect(calculateEmi(1_00_000, -1, 12)).toBe(0);
    expect(calculateEmi(Number.NaN, 10, 12)).toBe(0);
  });
});

describe('calculateProcessingFee', () => {
  it.each([
    [50_000, 2_000],
    [3_00_000, 3_000],
    [25_00_000, 25_000],
    [1_00_00_000, 25_000],
    [0, 0],
  ])('fee for %i is %i', (amount, fee) => {
    expect(calculateProcessingFee(amount)).toBe(fee);
  });
});

describe('estimateLoan', () => {
  it('derives totals from the rounded EMI', () => {
    const estimate = estimateLoan(5_00_000, 10.5, 36);
    expect(estimate.emi).toBe(16251);
    expect(estimate.totalRepayment).toBe(16251 * 36);
    expect(estimate.totalInterest).toBe(16251 * 36 - 5_00_000);
    expect(estimate.processingFee).toBe(5_000);
    expect(estimate.totalPayable).toBe(estimate.totalRepayment + 5_000);
  });

  it('uses the product rate and waits for complete inputs', () => {
    expect(estimateForLoan('home', 30_00_000, 240)?.annualRate).toBe(8.5);
    expect(estimateForLoan('business', 10_00_000, 60)?.annualRate).toBe(14);
    expect(estimateForLoan('', 10_00_000, 60)).toBeNull();
    expect(estimateForLoan('personal', null, 60)).toBeNull();
  });
});

describe('calculateApr', () => {
  it('equals the interest rate when there are no fees', () => {
    const emi = calculateEmi(5_00_000, 10.5, 36);
    expect(calculateApr(5_00_000, 0, emi, 36)).toBeCloseTo(10.5, 2);
  });

  it('rises above the interest rate once the processing fee is included', () => {
    const estimate = estimateLoan(5_00_000, 10.5, 36);
    expect(estimate.apr).toBeGreaterThan(10.5);
    expect(estimate.apr).toBeCloseTo(11.18, 1);
  });

  it('handles degenerate inputs', () => {
    expect(calculateApr(1_000, 2_000, 100, 12)).toBe(0);
    expect(calculateApr(1_00_000, 0, 0, 12)).toBe(0);
  });
});

describe('assessAffordability', () => {
  it('flags EMIs above half of income and includes rent as an obligation', () => {
    const ok = assessAffordability(20_000, 50_000, 10_000);
    expect(ok).toMatchObject({
      emiToIncomeRatio: 0.4, obligationRatio: 0.6, exceedsLimit: false, disposableIncome: 20_000,
    });
    expect(assessAffordability(26_000, 50_000)?.exceedsLimit).toBe(true);
    expect(assessAffordability(25_000, 50_000)?.exceedsLimit).toBe(false);
  });

  it('returns null without income', () => {
    expect(assessAffordability(10_000, 0)).toBeNull();
  });

  it('inverts the EMI formula for the eligibility calculator', () => {
    const principal = maxPrincipalForEmi(16251.1, 10.5, 36);
    expect(principal).toBeCloseTo(5_00_000, -1);
    expect(maxPrincipalForEmi(10_000, 0, 12)).toBe(1_20_000);
    expect(maxPrincipalForEmi(0, 10, 12)).toBe(0);
  });
});

describe('date helpers', () => {
  const today = new Date(2026, 9, 13); // 13 Oct 2026

  it('parses local calendar dates and rejects impossible ones', () => {
    expect(toIsoDate(parseIsoDate('2004-10-13') as Date)).toBe('2004-10-13');
    expect(parseIsoDate('2023-02-30')).toBeNull();
    expect(parseIsoDate('13/10/2004')).toBeNull();
  });

  it('treats a birthday today as a completed year', () => {
    expect(calculateAge('2005-10-13', today)).toBe(21);
    expect(calculateAge('2005-10-14', today)).toBe(20); // 20 years 364 days
    expect(calculateAge('bad', today)).toBeNull();
  });

  it('computes months until a given age', () => {
    expect(monthsUntilAge('1966-10-13', 65, today)).toBe(5 * 12);
    expect(monthsUntilAge('1966-10-14', 65, today)).toBe(60);
    expect(monthsUntilAge('1966-10-12', 65, today)).toBe(59);
    expect(monthsUntilAge('1950-01-01', 65, today)).toBe(0);
  });

  it('handles 29 February birthdays', () => {
    expect(toIsoDate(dateOfAge('2004-02-29', 21) as Date)).toBe('2025-02-28');
    expect(isoDateYearsAgo(21, today)).toBe('2005-10-13');
  });
});
