// ─────────────────────────────────────────────────────────────────────────────
// seed.js — Populate DB with realistic Indian demo data
// Author: Soumoditya Das
// Run: node server/db/seed.js
// ─────────────────────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const { initDB, getDB } = require('./database');

// ── Pure integer salary engine ────────────────────────────────────────────────
// Stores all values as micro-cents (× 1,000,000) to avoid floating-point errors
function toMC(rupees) { return Math.round(rupees * 1_000_000); }

function calcSalaryMC(baseRupees) {
  const m     = toMC(baseRupees);
  const basic = Math.floor(m * 50 / 100);
  const hra   = Math.floor(basic * 50 / 100);
  const sa    = toMC(1250);
  const pb    = Math.floor(basic * 10 / 100);
  const lta   = Math.floor(basic * 5 / 100);
  const fa    = Math.max(0, m - basic - hra - sa - pb - lta);
  const gross = basic + hra + sa + pb + lta + fa;
  const pf    = Math.floor(basic * 12 / 100);
  const pt    = toMC(200);
  const tds   = Math.floor(gross * 5 / 100);
  const ded   = pf + pt + tds;
  const net   = gross - ded;
  return { basic, hra, sa, pb, lta, fa, gross, pf, pt, tds, ded, net, annualCTC: gross * 12 };
}

async function seed() {
  initDB();
  const db = getDB();
  if (!db) { console.error('[SEED] No DB available'); process.exit(1); }

  console.log('[SEED] Seeding database with demo data...');

  // ── Departments ──────────────────────────────────────────────────────────
  const depts = [
    { name: 'Engineering',  code: 'ENG' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Finance',      code: 'FIN' },
    { name: 'Marketing',    code: 'MKT' },
    { name: 'Design',       code: 'DSN' },
    { name: 'Operations',   code: 'OPS' },
  ];
  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)');
  depts.forEach(d => insertDept.run(d.name, d.code));

  // ── Shifts ───────────────────────────────────────────────────────────────
  db.prepare('INSERT OR IGNORE INTO shifts (id,name,start_time,end_time,grace_mins) VALUES (1,"General Shift","09:00","18:00",15)').run();
  db.prepare('INSERT OR IGNORE INTO shifts (id,name,start_time,end_time,grace_mins) VALUES (2,"Morning Shift","07:00","15:00",10)').run();
  db.prepare('INSERT OR IGNORE INTO shifts (id,name,start_time,end_time,grace_mins) VALUES (3,"Night Shift","21:00","06:00",15)').run();

  // ── Leave Types ───────────────────────────────────────────────────────────
  const lTypes = [
    { name:'CASUAL',   max:12, carry:0, paid:1 },
    { name:'SICK',     max:12, carry:0, paid:1 },
    { name:'EARNED',   max:21, carry:1, paid:1 },
    { name:'MATERNITY',max:180,carry:0, paid:1 },
    { name:'LOP',      max:0,  carry:0, paid:0 },
  ];
  const insLT = db.prepare('INSERT OR IGNORE INTO leave_types (name,max_days,carry_forward,paid) VALUES (?,?,?,?)');
  lTypes.forEach(l => insLT.run(l.name, l.max, l.carry, l.paid));

  // ── Employees (Indian Names) ──────────────────────────────────────────────
  const pwHash = bcrypt.hashSync('password123', 10);
  const admHash = bcrypt.hashSync('admin@2026', 10);

  const emps = [
    { code:'EMP-2024-001', fn:'Soumoditya', ln:'Das',       email:'soumoditya@hrms.in',  dept:1, portal:'ADMIN',    wage:185000 },
    { code:'EMP-2024-002', fn:'Aarav',      ln:'Mehta',     email:'aarav.mehta@hrms.in', dept:2, portal:'HR',       wage:145000 },
    { code:'EMP-2024-003', fn:'Priya',      ln:'Nair',      email:'priya.nair@hrms.in',  dept:3, portal:'EMPLOYEE', wage:95000  },
    { code:'EMP-2024-004', fn:'Rohan',      ln:'Verma',     email:'rohan.v@hrms.in',     dept:4, portal:'EMPLOYEE', wage:88000  },
    { code:'EMP-2024-005', fn:'Sneha',      ln:'Gupta',     email:'sneha.g@hrms.in',     dept:1, portal:'EMPLOYEE', wage:75000  },
    { code:'EMP-2024-006', fn:'Vikram',     ln:'Bhat',      email:'vikram.b@hrms.in',    dept:1, portal:'EMPLOYEE', wage:85000  },
    { code:'EMP-2024-007', fn:'Ananya',     ln:'Iyer',      email:'ananya.i@hrms.in',    dept:5, portal:'EMPLOYEE', wage:65000  },
    { code:'EMP-2024-008', fn:'Kiran',      ln:'Patel',     email:'kiran.p@hrms.in',     dept:6, portal:'EMPLOYEE', wage:72000  },
    { code:'EMP-2024-009', fn:'Deepak',     ln:'Menon',     email:'deepak.m@hrms.in',    dept:1, portal:'EMPLOYEE', wage:90000  },
    { code:'EMP-2024-010', fn:'Kavya',      ln:'Reddy',     email:'kavya.r@hrms.in',     dept:4, portal:'EMPLOYEE', wage:68000  },
    { code:'EMP-2024-011', fn:'Arjun',      ln:'Singh',     email:'arjun.s@hrms.in',     dept:2, portal:'HR',       wage:78000  },
    { code:'EMP-2024-012', fn:'Meera',      ln:'Krishnan',  email:'meera.k@hrms.in',     dept:3, portal:'EMPLOYEE', wage:82000  },
  ];

  const insEmp = db.prepare(`
    INSERT OR IGNORE INTO employees
      (emp_code,first_name,last_name,email,dept_id,portal_role,base_wage_microcents,
       status,join_date,dob,phone,password_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const dobs = ['1995-07-05','1993-11-14','1996-09-08','1994-03-21','1998-05-12',
                '1992-08-30','1997-02-17','1995-12-04','1991-06-25','1999-01-09',
                '1994-09-16','1996-04-03'];

  emps.forEach((e, i) => {
    const hash = e.portal === 'ADMIN' ? admHash : pwHash;
    insEmp.run(
      e.code, e.fn, e.ln, e.email, e.dept, e.portal,
      toMC(e.wage), 'ACTIVE', '2024-01-01',
      dobs[i], `+91-98765-${43200 + i}`, hash
    );
  });

  // ── Attendance for last 7 days ─────────────────────────────────────────────
  const insAtt = db.prepare(`
    INSERT OR IGNORE INTO attendance (emp_id,date,check_in,check_out,work_mins,status)
    VALUES (?,?,?,?,?,?)
  `);
  for (let d = 6; d >= 0; d--) {
    const dt = new Date(); dt.setDate(dt.getDate() - d);
    const dateStr = dt.toISOString().split('T')[0];
    const day     = dt.getDay(); // 0=Sun
    for (let empId = 1; empId <= 12; empId++) {
      if (day === 0 || day === 6) continue; // Weekend
      const isAbsent = (empId === 3 && d < 2) || (empId === 4 && d < 5);
      if (isAbsent) {
        insAtt.run(empId, dateStr, null, null, 0, 'ABSENT');
      } else {
        const checkIn  = `${dateStr}T09:${String(Math.floor(Math.random()*20)).padStart(2,'0')}:00.000Z`;
        const checkOut = `${dateStr}T18:${String(Math.floor(Math.random()*20)+10).padStart(2,'0')}:00.000Z`;
        const workMins = 540 - Math.floor(Math.random() * 30);
        insAtt.run(empId, dateStr, checkIn, checkOut, workMins, 'PRESENT');
      }
    }
  }

  // ── Leave Requests ─────────────────────────────────────────────────────────
  const insLeave = db.prepare(`
    INSERT OR IGNORE INTO leave_requests
      (emp_id,leave_type_id,from_date,to_date,days,reason,status,applied_at)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  insLeave.run(3,'2','2026-07-04','2026-07-05',2,'Fever and cold','PENDING','2026-07-03T10:00:00');
  insLeave.run(4,'1','2026-07-01','2026-07-05',5,'Family function','APPROVED','2026-06-25T14:00:00');
  insLeave.run(7,'2','2026-06-20','2026-06-22',3,'Medical procedure','APPROVED','2026-06-19T09:30:00');

  // ── Payroll run for June 2026 ──────────────────────────────────────────────
  const runId = db.prepare(`
    INSERT OR IGNORE INTO payroll_runs (month,year,run_by,status)
    VALUES (6,2026,1,'APPROVED') RETURNING id
  `).get()?.id;

  if (runId) {
    const insSlip = db.prepare(`
      INSERT OR IGNORE INTO payslips
        (run_id,emp_id,working_days,basic_microcents,hra_microcents,
         special_allowance_mc,performance_bonus_mc,lta_microcents,
         flexible_allowance_mc,gross_microcents,pf_microcents,
         professional_tax_mc,tds_microcents,total_deduction_mc,
         net_microcents,annual_ctc_mc)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    emps.forEach((e, i) => {
      const s = calcSalaryMC(e.wage);
      insSlip.run(runId, i+1, 22,
        s.basic, s.hra, s.sa, s.pb, s.lta, s.fa,
        s.gross, s.pf, s.pt, s.tds, s.ded, s.net, s.annualCTC
      );
    });
  }

  // ── Notices ────────────────────────────────────────────────────────────────
  const insNotice = db.prepare(`INSERT OR IGNORE INTO notices (title,body,priority,posted_by) VALUES (?,?,?,?)`);
  insNotice.run('Q3 Performance Reviews Begin', 'Annual performance review cycle starts from 10th July 2026. Managers please complete goal setting.', 'HIGH', 1);
  insNotice.run('Office Closed - Bakrid', 'Office will be closed on 6th July 2026 for Bakrid. Please plan accordingly.', 'NORMAL', 2);
  insNotice.run('New HR Policy Update', 'Updated leave encashment and WFH policies are now live. Check the Knowledge Base.', 'NORMAL', 2);

  // ── Tickets ────────────────────────────────────────────────────────────────
  const insTkt = db.prepare(`INSERT OR IGNORE INTO tickets (subject,description,emp_id,category,priority,status) VALUES (?,?,?,?,?,?)`);
  insTkt.run('Laptop Fan Making Noise', 'My work laptop fan is unusually loud, please check.', 5, 'IT', 'MEDIUM', 'OPEN');
  insTkt.run('Access to Figma Pro', 'Need Figma Pro access for design project Q3.', 7, 'SOFTWARE', 'LOW', 'IN_PROGRESS');

  console.log('[SEED] ✅ Database seeded with Indian demo data.');
  process.exit(0);
}

seed().catch(e => { console.error('[SEED ERROR]', e); process.exit(1); });
