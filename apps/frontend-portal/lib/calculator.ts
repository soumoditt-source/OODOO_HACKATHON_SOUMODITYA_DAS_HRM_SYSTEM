// ─────────────────────────────────────────────────────────────────────────────
// Salary Calculator — pure integer math engine (inlined, zero-dependency)
// All monetary values in micro-cents to bypass floating-point hazards entirely.
// e.g. $75,000.00 => passed as 75000 (dollars) and multiplied internally.
// ─────────────────────────────────────────────────────────────────────────────

export interface SalaryBreakdown {
  basic: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  lta: number;
  fixedAllowance: number;
  pfDeduction: number;
  ptDeduction: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
}

/**
 * calculateSalaryComponents
 * @param baseWageDollars  - The base wage in dollars (e.g. 75000)
 * @param pfRatePercent    - PF rate, default 12%
 * @returns SalaryBreakdown - All components as dollar values (2dp)
 */
export function calculateSalaryComponents(
  baseWageDollars: number,
  pfRatePercent: number = 12
): SalaryBreakdown {
  // Convert to micro-cents (multiply by 1,000,000) for integer arithmetic
  const micro = Math.round(baseWageDollars * 1_000_000);

  // 1. Basic = 50% of base wage
  const basicMicro = Math.floor((micro * 50) / 100);

  // 2. HRA = 50% of Basic
  const hraMicro = Math.floor((basicMicro * 50) / 100);

  // 3. Standard Allowance = fixed $416.70 per month (416700000 micro-cents)
  const standardAllowanceMicro = 416_700_000;

  // 4. Performance Bonus = 8.33% of Basic
  const performanceBonusMicro = Math.floor((basicMicro * 833) / 10_000);

  // 5. LTA = 8.333% of Basic
  const ltaMicro = Math.floor((basicMicro * 8333) / 100_000);

  // 6. Fixed Allowance = residual to make total exactly equal base wage
  const allocatedSoFar =
    basicMicro + hraMicro + standardAllowanceMicro + performanceBonusMicro + ltaMicro;
  const fixedAllowanceMicro = Math.max(0, micro - allocatedSoFar);

  // Gross = sum of all earnings
  const grossMicro =
    basicMicro + hraMicro + standardAllowanceMicro + performanceBonusMicro + ltaMicro + fixedAllowanceMicro;

  // Deductions
  const pfMicro = Math.floor((basicMicro * pfRatePercent) / 100);
  const ptMicro = 200_000_000; // Fixed professional tax = $200.00

  const totalDeductionsMicro = pfMicro + ptMicro;
  const netPayableMicro = grossMicro - totalDeductionsMicro;

  // Convert back to dollars with 2dp
  const toD = (m: number) => parseFloat((m / 1_000_000).toFixed(2));

  return {
    basic: toD(basicMicro),
    hra: toD(hraMicro),
    standardAllowance: toD(standardAllowanceMicro),
    performanceBonus: toD(performanceBonusMicro),
    lta: toD(ltaMicro),
    fixedAllowance: toD(fixedAllowanceMicro),
    pfDeduction: toD(pfMicro),
    ptDeduction: toD(ptMicro),
    grossEarnings: toD(grossMicro),
    totalDeductions: toD(totalDeductionsMicro),
    netPayable: toD(netPayableMicro),
  };
}
