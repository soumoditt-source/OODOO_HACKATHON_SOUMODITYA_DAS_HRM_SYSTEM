// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Home Page — Server Component (no 'use client' needed)
// Imports client components (SalaryInfo, Calendar) which handle their own state
// ─────────────────────────────────────────────────────────────────────────────

import SalaryInfo from '../components/SalaryInfo';
import Calendar from '../components/Calendar';

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto p-8 space-y-10">

      {/* ── Header ── */}
      <header className="flex items-start justify-between">
        <div>
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
            Admin Dashboard
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white leading-none">
            Good morning, Soumoditya 👋
          </h1>
          <p className="text-zinc-500 mt-2 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-400">All Systems Operational</span>
        </div>
      </header>

      {/* ── KPI Bento Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: '128', sub: '+3 this month', color: 'indigo' },
          { label: 'Present Today',   value: '112', sub: '87.5% attendance', color: 'emerald' },
          { label: 'On Leave',        value: '9',   sub: '3 pending approval', color: 'amber' },
          { label: 'Payroll Due',     value: '27d', sub: 'Next cycle: Aug 1', color: 'violet' },
        ].map(({ label, value, sub, color }) => (
          <div
            key={label}
            className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-${color}-500/30 transition-all duration-200`}
          >
            <div className={`text-xs font-bold text-${color}-400 uppercase tracking-widest mb-3`}>
              {label}
            </div>
            <div className="text-4xl font-black text-white mb-1">{value}</div>
            <div className="text-xs text-zinc-600">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Employee Profile Card ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl">
            SD
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-zinc-900" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-white">Soumoditya Das</h2>
          <p className="text-zinc-400 text-sm mt-0.5">Senior Software Engineer · EMP-2024-001</p>
          <div className="flex gap-3 mt-3">
            <span className="text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full font-bold">
              Admin
            </span>
            <span className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full font-bold">
              ● Active
            </span>
            <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-3 py-1 rounded-full font-bold">
              Joining: Jan 15, 2024
            </span>
          </div>
        </div>
        <div className="hidden md:grid grid-cols-3 gap-6 text-center">
          {[
            { label: 'Days Present', value: '22' },
            { label: 'Leaves Left', value: '12' },
            { label: 'Extra Hours', value: '14h' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="text-xs text-zinc-600 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Salary Section ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white">Salary Configuration</h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              Pure integer micro-cent math engine — zero floating-point error
            </p>
          </div>
        </div>
        <SalaryInfo />
      </section>

      {/* ── Calendar Section ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white">Attendance Matrix</h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              Month-by-month attendance tracker — built from scratch with CSS Grid
            </p>
          </div>
        </div>
        <Calendar />
      </section>

    </div>
  );
}
