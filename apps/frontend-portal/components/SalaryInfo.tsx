'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Salary Info Bento-Grid Component
// Real-time integer-math salary breakdown that updates on every keystroke.
// Zero external dependencies. Pure React + Tailwind.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { calculateSalaryComponents, SalaryBreakdown } from '../lib/calculator';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function SalaryInfo() {
  const [wage, setWage] = useState<string>('75000');
  const [bd, setBd] = useState<SalaryBreakdown | null>(null);

  useEffect(() => {
    const n = parseFloat(wage);
    if (!isNaN(n) && n > 0) {
      setBd(calculateSalaryComponents(n));
    } else {
      setBd(null);
    }
  }, [wage]);

  return (
    <div className="space-y-6">
      {/* Wage Input */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
          Defined Base Wage / Month
        </label>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-light text-zinc-400">$</span>
          <input
            type="number"
            value={wage}
            onChange={(e) => setWage(e.target.value)}
            className="flex-1 bg-black border border-zinc-700 rounded-xl py-4 px-5 text-3xl font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-zinc-700"
            placeholder="0"
          />
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          All components computed via integer micro-cent arithmetic (no floating-point drift)
        </p>
      </div>

      {bd && (
        <>
          {/* Earnings Grid */}
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
              Gross Earnings Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Basic (50%)', value: bd.basic, color: 'indigo' },
                { label: 'HRA (50% of Basic)', value: bd.hra, color: 'violet' },
                { label: 'Standard Allowance', value: bd.standardAllowance, color: 'sky' },
                { label: 'Performance Bonus (8.33%)', value: bd.performanceBonus, color: 'amber' },
                { label: 'LTA (8.333%)', value: bd.lta, color: 'teal' },
                { label: 'Fixed Residue', value: bd.fixedAllowance, color: 'purple' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className={`bg-${color}-500/5 border border-${color}-500/20 rounded-xl p-4 hover:border-${color}-500/50 transition-all`}
                >
                  <div className={`text-xs font-bold text-${color}-400 uppercase tracking-wide mb-2`}>
                    {label}
                  </div>
                  <div className={`text-xl font-mono font-bold text-${color}-300`}>
                    {fmt(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deductions + Net */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
              <div className="text-xs font-bold text-rose-400 uppercase tracking-wide mb-2">
                PF Deduction (12%)
              </div>
              <div className="text-xl font-mono font-bold text-rose-300">
                -{fmt(bd.pfDeduction)}
              </div>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
              <div className="text-xs font-bold text-rose-400 uppercase tracking-wide mb-2">
                Professional Tax
              </div>
              <div className="text-xl font-mono font-bold text-rose-300">
                -{fmt(bd.ptDeduction)}
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 ring-1 ring-emerald-500/20">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">
                ✦ Net Take-Home
              </div>
              <div className="text-2xl font-mono font-black text-emerald-300">
                {fmt(bd.netPayable)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                After {fmt(bd.totalDeductions)} deductions
              </div>
            </div>
          </div>

          {/* CTC Summary Bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Annual CTC</div>
              <div className="text-3xl font-mono font-black text-white">
                {fmt(bd.grossEarnings * 12)}
              </div>
            </div>
            <div className="w-px h-12 bg-zinc-800 hidden md:block" />
            <div className="flex-1">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Annual Net</div>
              <div className="text-3xl font-mono font-black text-emerald-400">
                {fmt(bd.netPayable * 12)}
              </div>
            </div>
            <div className="w-px h-12 bg-zinc-800 hidden md:block" />
            <div className="flex-1">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Effective Tax Rate</div>
              <div className="text-3xl font-mono font-black text-amber-400">
                {bd.grossEarnings > 0
                  ? ((bd.totalDeductions / bd.grossEarnings) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
