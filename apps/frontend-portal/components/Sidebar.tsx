'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar — client component with navigation + dark mode toggle
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',            label: 'Dashboard',  icon: '⊞' },
  { href: '/employees',   label: 'Employees',  icon: '👤' },
  { href: '/attendance',  label: 'Attendance', icon: '📅' },
  { href: '/time-off',    label: 'Time Off',   icon: '🌴' },
  { href: '/profile',     label: 'My Profile', icon: '⚙️' },
  { href: '/payroll',     label: 'Payroll',    icon: '💰' },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/60 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800/60 gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-sm font-black text-white shadow-lg">
          O
        </div>
        <div>
          <div className="text-sm font-black text-white tracking-tight">Odoo HRMS</div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Enterprise Suite</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] text-zinc-600 uppercase tracking-widest px-3 py-2 mt-2">
          Main Menu
        </div>
        {NAV.map(({ href, label, icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
            >
              <span className="text-base">{icon}</span>
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800/60">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
            SD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-zinc-100 truncate">Soumoditya Das</div>
            <div className="text-[10px] text-zinc-500">Admin</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
        </div>
      </div>
    </aside>
  );
}
