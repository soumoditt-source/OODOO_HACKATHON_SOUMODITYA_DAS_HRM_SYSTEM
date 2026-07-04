-- ═══════════════════════════════════════════════════════════════
-- ODOO HRMS — PostgreSQL Compatible Schema
-- Author: Soumoditya Das | Odoo Hackathon 2026
-- Purpose: Enterprise-grade relational model for HR management
-- Compatible: PostgreSQL 15+, SQLite 3 (via better-sqlite3)
-- ═══════════════════════════════════════════════════════════════

-- ─── DEPARTMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,
  head_id     INTEGER,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── ROLES / DESIGNATIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  dept_id     INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  level       TEXT CHECK(level IN ('L1','L2','L3','MANAGER','DIRECTOR','VP','C-LEVEL')) DEFAULT 'L1',
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── EMPLOYEES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_code        TEXT NOT NULL UNIQUE,         -- EMP-2024-001
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  dob             TEXT,                          -- YYYY-MM-DD
  gender          TEXT CHECK(gender IN ('M','F','OTHER')),
  address         TEXT,
  dept_id         INTEGER REFERENCES departments(id),
  role_id         INTEGER REFERENCES roles(id),
  portal_role     TEXT NOT NULL DEFAULT 'EMPLOYEE'
                  CHECK(portal_role IN ('ADMIN','HR','EMPLOYEE')),
  -- Salary in integer micro-cents (avoids floating point errors)
  -- e.g. ₹75,000 stored as 75000000000 (× 1,000,000)
  base_wage_microcents INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK(status IN ('ACTIVE','INACTIVE','ON_LEAVE','TERMINATED')),
  join_date       TEXT NOT NULL,
  pan_number      TEXT,
  aadhar_number   TEXT,
  bank_account    TEXT,
  bank_ifsc       TEXT,
  password_hash   TEXT NOT NULL,
  last_login      TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_emp_email  ON employees(email);
CREATE INDEX IF NOT EXISTS idx_emp_code   ON employees(emp_code);
CREATE INDEX IF NOT EXISTS idx_emp_dept   ON employees(dept_id);

-- ─── SHIFTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  start_time    TEXT NOT NULL,  -- HH:MM
  end_time      TEXT NOT NULL,  -- HH:MM
  grace_mins    INTEGER DEFAULT 15,
  is_night      INTEGER DEFAULT 0
);

-- ─── SHIFT ROSTER ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_roster (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_id      INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id    INTEGER NOT NULL REFERENCES shifts(id),
  date        TEXT NOT NULL,  -- YYYY-MM-DD
  UNIQUE(emp_id, date)
);

-- ─── ATTENDANCE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_id          INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,          -- YYYY-MM-DD
  check_in        TEXT,                   -- ISO timestamp
  check_out       TEXT,                   -- ISO timestamp
  break_mins      INTEGER DEFAULT 0,
  work_mins       INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'PRESENT'
                  CHECK(status IN ('PRESENT','ABSENT','HALF_DAY','WFH','ON_LEAVE','HOLIDAY')),
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(emp_id, date)
);
CREATE INDEX IF NOT EXISTS idx_att_emp  ON attendance(emp_id);
CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date);

-- ─── LEAVE TYPES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_types (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,   -- SICK, CASUAL, EARNED, MATERNITY
  max_days      INTEGER NOT NULL,
  carry_forward INTEGER DEFAULT 0,
  paid          INTEGER DEFAULT 1       -- 1=paid, 0=unpaid
);

-- ─── LEAVE REQUESTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_id          INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id   INTEGER NOT NULL REFERENCES leave_types(id),
  from_date       TEXT NOT NULL,
  to_date         TEXT NOT NULL,
  days            REAL NOT NULL,       -- supports 0.5 for half-day
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  reviewed_by     INTEGER REFERENCES employees(id),
  reviewed_at     TEXT,
  applied_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leave_emp ON leave_requests(emp_id);

-- ─── PAYROLL ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_runs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  month           INTEGER NOT NULL,   -- 1-12
  year            INTEGER NOT NULL,
  run_by          INTEGER REFERENCES employees(id),
  status          TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','DISBURSED')),
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS payslips (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id                  INTEGER NOT NULL REFERENCES payroll_runs(id),
  emp_id                  INTEGER NOT NULL REFERENCES employees(id),
  working_days            INTEGER NOT NULL DEFAULT 22,
  -- All values stored as INTEGER micro-cents (×1,000,000)
  basic_microcents        INTEGER NOT NULL DEFAULT 0,
  hra_microcents          INTEGER NOT NULL DEFAULT 0,
  special_allowance_mc    INTEGER NOT NULL DEFAULT 0,
  performance_bonus_mc    INTEGER NOT NULL DEFAULT 0,
  lta_microcents          INTEGER NOT NULL DEFAULT 0,
  flexible_allowance_mc   INTEGER NOT NULL DEFAULT 0,
  gross_microcents        INTEGER NOT NULL DEFAULT 0,
  pf_microcents           INTEGER NOT NULL DEFAULT 0,
  professional_tax_mc     INTEGER NOT NULL DEFAULT 0,
  tds_microcents          INTEGER NOT NULL DEFAULT 0,
  total_deduction_mc      INTEGER NOT NULL DEFAULT 0,
  net_microcents          INTEGER NOT NULL DEFAULT 0,
  annual_ctc_mc           INTEGER NOT NULL DEFAULT 0,
  generated_at            TEXT DEFAULT (datetime('now')),
  UNIQUE(run_id, emp_id)
);

-- ─── NOTICES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  priority    TEXT DEFAULT 'NORMAL' CHECK(priority IN ('LOW','NORMAL','HIGH','URGENT')),
  posted_by   INTEGER REFERENCES employees(id),
  expires_at  TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── TICKETS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  subject     TEXT NOT NULL,
  description TEXT,
  emp_id      INTEGER NOT NULL REFERENCES employees(id),
  category    TEXT DEFAULT 'GENERAL',
  priority    TEXT DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status      TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),
  assigned_to INTEGER REFERENCES employees(id),
  created_at  TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- ─── AUDIT LOG ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_id      INTEGER REFERENCES employees(id),
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   INTEGER,
  details     TEXT,
  ip_addr     TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_emp ON audit_log(emp_id);
