export interface SalaryBreakdown {
  basic_micro: number;
  hra_micro: number;
  standard_allowance_micro: number;
  performance_bonus_micro: number;
  lta_micro: number;
  fixed_allowance_micro: number;
  pf_deduction_micro: number;
  pt_deduction_micro: number;
  net_payable_micro: number;
}

export function calculateSalaryComponents(
  baseWageMicro: number,
  pfRatePercent: number = 12
): SalaryBreakdown {
  // Monetary Values: Handled strictly in micro-cents/integers to bypass floating-point rounding hazards
  // Percentages are handled by multiplying by the percentage and dividing by 100, then flooring/rounding.
  
  const basic_micro = Math.floor((baseWageMicro * 50) / 100);
  const hra_micro = Math.floor((basic_micro * 50) / 100);
  const standard_allowance_micro = 41670000; // Fixed 4167.00 represented in micro-cents (Wait, 416700 if cents, micro-cents usually * 1,000,000. Let's assume the prompt meant cents if it said 416700, wait, "416700" for standard allowance. Let's use exactly 416700)
  
  // Actually, standard allowance fixed is 416700 in micro units as per prompt. Let's use 416700.
  const standard_allowance = 416700;
  const performance_bonus_micro = Math.floor((basic_micro * 833) / 10000); // 8.33%
  const lta_micro = Math.floor((basic_micro * 8333) / 100000); // 8.333%
  
  const total_computed = basic_micro + hra_micro + standard_allowance + performance_bonus_micro + lta_micro;
  
  // Residual balance forced into Fixed Allowance
  const fixed_allowance_micro = Math.max(0, baseWageMicro - total_computed);
  
  const pf_deduction_micro = Math.floor((basic_micro * pfRatePercent) / 100);
  const pt_deduction_micro = 20000; // $200.00
  
  const gross_earnings = basic_micro + hra_micro + standard_allowance + performance_bonus_micro + lta_micro + fixed_allowance_micro;
  const total_deductions = pf_deduction_micro + pt_deduction_micro;
  const net_payable_micro = gross_earnings - total_deductions;
  
  return {
    basic_micro,
    hra_micro,
    standard_allowance_micro: standard_allowance,
    performance_bonus_micro,
    lta_micro,
    fixed_allowance_micro,
    pf_deduction_micro,
    pt_deduction_micro,
    net_payable_micro
  };
}
