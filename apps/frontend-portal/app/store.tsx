'use client';

// ─────────────────────────────────────────────────────────────────────────────
// HRMS Global State Store
// Self-contained React Context — no workspace imports needed.
// Fully client-side only via 'use client' directive.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, ReactNode } from 'react';

type UserRole = 'ADMIN' | 'EMPLOYEE' | null;

export interface AppState {
  role: UserRole;
  employeeId: string | null;
  baseWage: number;
  darkMode: boolean;
}

interface AppContextType {
  state: AppState;
  setRole: (role: UserRole) => void;
  setBaseWage: (wage: number) => void;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultState: AppState = {
  role: 'ADMIN',
  employeeId: 'emp-001-soumoditya',
  baseWage: 75000,
  darkMode: true,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);

  const setRole = (role: UserRole) =>
    setState((prev) => ({ ...prev, role }));

  const setBaseWage = (baseWage: number) =>
    setState((prev) => ({ ...prev, baseWage }));

  const toggleDarkMode = () =>
    setState((prev) => ({ ...prev, darkMode: !prev.darkMode }));

  return (
    <AppContext.Provider value={{ state, setRole, setBaseWage, toggleDarkMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be inside AppProvider');
  return ctx;
}
