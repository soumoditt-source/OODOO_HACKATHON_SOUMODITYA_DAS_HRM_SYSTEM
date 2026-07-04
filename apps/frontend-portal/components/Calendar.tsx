'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Attendance Calendar
// Pure CSS Grid + native JS Date primitives. Zero libraries.
// Color codes: Present=emerald, Absent=rose, Leave=indigo, Weekend=zinc
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';

type DayStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY' | 'HOLIDAY' | 'WEEKEND' | 'FUTURE';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Deterministic mock statuses based on day index for demo
function getMockStatus(day: number, month: number, year: number): DayStatus {
  const today = new Date();
  const d = new Date(year, month, day);
  if (d > today) return 'FUTURE';
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return 'WEEKEND';
  if (day === 15) return 'HOLIDAY';
  if (day % 12 === 0) return 'LEAVE';
  if (day % 9 === 0) return 'HALF_DAY';
  if (day % 7 === 0) return 'ABSENT';
  return 'PRESENT';
}

const STATUS_STYLES: Record<DayStatus, string> = {
  PRESENT:  'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
  ABSENT:   'border-rose-500/60 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
  LEAVE:    'border-indigo-500/60 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20',
  HALF_DAY: 'border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
  HOLIDAY:  'border-purple-500/60 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20',
  WEEKEND:  'border-zinc-800 bg-zinc-900/30 text-zinc-600',
  FUTURE:   'border-zinc-800/50 bg-zinc-950/30 text-zinc-700',
};

const STATUS_DOT: Record<DayStatus, string> = {
  PRESENT:  'bg-emerald-500',
  ABSENT:   'bg-rose-500',
  LEAVE:    'bg-indigo-500',
  HALF_DAY: 'bg-amber-500',
  HOLIDAY:  'bg-purple-500',
  WEEKEND:  'bg-zinc-700',
  FUTURE:   'bg-zinc-800',
};

export default function Calendar() {
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prev = () => setViewDate(new Date(year, month - 1, 1));
  const next = () => setViewDate(new Date(year, month + 1, 1));

  const isToday = (d: number) =>
    d === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  // Tally for summary bar
  const tally: Partial<Record<DayStatus, number>> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const s = getMockStatus(d, month, year);
    tally[s] = (tally[s] || 0) + 1;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={prev}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all"
          >
            ‹
          </button>
          <h2 className="text-xl font-bold text-white min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={next}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all"
          >
            ›
          </button>
        </div>
        {/* Legend */}
        <div className="hidden md:flex gap-4 flex-wrap">
          {(['PRESENT','ABSENT','LEAVE','HALF_DAY','HOLIDAY'] as DayStatus[]).map(s => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
              {s.replace('_',' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs font-bold uppercase tracking-widest text-zinc-600 py-1">
            {d}
          </div>
        ))}

        {/* Blank cells before first day */}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`blank-${i}`} className="h-16 rounded-lg bg-transparent" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const status = getMockStatus(day, month, year);
          return (
            <button
              key={day}
              title={status}
              className={`
                h-16 rounded-xl border flex flex-col items-start justify-between p-2
                transition-all duration-150 cursor-pointer
                ${STATUS_STYLES[status]}
                ${isToday(day) ? 'ring-2 ring-white/30' : ''}
              `}
            >
              <span className={`
                text-sm font-bold leading-none
                ${isToday(day) ? 'w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs' : ''}
              `}>
                {day}
              </span>
              {status !== 'WEEKEND' && status !== 'FUTURE' && (
                <span className="text-[9px] font-bold uppercase tracking-widest leading-none opacity-70">
                  {status.replace('_', ' ')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-zinc-800">
        {Object.entries(tally).filter(([k]) => !['WEEKEND','FUTURE'].includes(k)).map(([status, count]) => (
          <div key={status} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status as DayStatus]}`} />
            <span className="text-xs text-zinc-400 font-medium">
              {count} {status.replace('_',' ')}
            </span>
          </div>
        ))}
        <span className="ml-auto text-xs text-zinc-600">
          Payable days: {(tally.PRESENT || 0) + Math.floor((tally.HALF_DAY || 0) / 2)}
        </span>
      </div>
    </div>
  );
}
