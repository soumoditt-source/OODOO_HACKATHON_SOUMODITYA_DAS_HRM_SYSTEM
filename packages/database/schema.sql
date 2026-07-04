-- Core Extensions and Schema Primitives
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE employee_status AS ENUM ('PRESENT', 'ABSENT', 'ON_LEAVE');
CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE leave_type AS ENUM ('PAID', 'SICK', 'UNPAID');

-- Global Structural Users & Roles (Bitmask Integration)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    salt VARCHAR(32) NOT NULL,
    role_mask INT NOT NULL DEFAULT 3 -- 1 (READ) | 2 (WRITE_SELF)
);

-- Core Employees Table
CREATE TABLE employees (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    emp_code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    current_status employee_status DEFAULT 'ABSENT',
    
    dob DATE NOT NULL,
    date_of_joining DATE NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    marital_status VARCHAR(20) NOT NULL,
    nationality VARCHAR(50) NOT NULL,
    residing_address TEXT NOT NULL,
    
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    pan_no VARCHAR(20) NOT NULL,
    
    monthly_wage_micro BIGINT NOT NULL DEFAULT 0 -- Micro-cents (e.g. 50000.00 = 500000000)
);

-- Real-Time Performance Optimized Attendance Ledger
CREATE TABLE attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out TIMESTAMP WITH TIME ZONE,
    work_hours_micro BIGINT DEFAULT 0,
    break_hours_micro BIGINT DEFAULT 0,
    extra_hours_micro BIGINT DEFAULT 0,
    CONSTRAINT unique_emp_date UNIQUE(employee_id, work_date)
);

-- System Leave Applications Structure
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status leave_status DEFAULT 'PENDING',
    remarks TEXT,
    admin_comments TEXT,
    attachment_path TEXT,
    CONSTRAINT valid_range CHECK (end_date >= start_date)
);

-- Salary Structures Generated per month
CREATE TABLE salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    month INT NOT NULL,
    year INT NOT NULL,
    base_wage_micro BIGINT NOT NULL,
    basic_micro BIGINT NOT NULL,
    hra_micro BIGINT NOT NULL,
    standard_allowance_micro BIGINT NOT NULL,
    performance_bonus_micro BIGINT NOT NULL,
    lta_micro BIGINT NOT NULL,
    fixed_allowance_micro BIGINT NOT NULL,
    pf_deduction_micro BIGINT NOT NULL,
    pt_deduction_micro BIGINT NOT NULL,
    net_payable_micro BIGINT NOT NULL,
    CONSTRAINT unique_emp_month_year UNIQUE(employee_id, month, year)
);

-- High-Density Cover Indexes for O(log N) Performance Lookups
CREATE INDEX idx_users_auth ON users(email);
CREATE INDEX idx_ledger_search ON attendance_logs(work_date, employee_id);
CREATE INDEX idx_leave_search ON leave_requests(employee_id, status);
CREATE INDEX idx_salary_search ON salary_structures(employee_id, month, year);
