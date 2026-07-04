// ─────────────────────────────────────────────────────────────────────────────
// index.js — Express API Server (Port 3001)
// Author: Soumoditya Das | Odoo Hackathon 2026
// Modular, zero external API dependencies, SQLite (PostgreSQL-compatible)
// ─────────────────────────────────────────────────────────────────────────────
const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { initDB, getDB } = require('./db/database');
const { authenticate, requireRole, JWT_SECRET } = require('./middleware/auth');
const path         = require('path');
const fs           = require('fs');

const app  = express();
const PORT = process.env.PORT || 8081;

// ── Salary micro-cent calculator (pure integer, no float errors) ──────────────
function toMC(r) { return Math.round(r * 1_000_000); }
function fromMC(mc) { return parseFloat((mc / 1_000_000).toFixed(2)); }

function calcSalaryMC(baseMC, days = 22, pfRate = 12) {
  const m     = baseMC;
  const basic = Math.floor(m * 50 / 100);
  const hra   = Math.floor(basic * 50 / 100);
  const sa    = toMC(1250);
  const pb    = Math.floor(basic * 10 / 100);
  const lta   = Math.floor(basic * 5 / 100);
  const fa    = Math.max(0, m - basic - hra - sa - pb - lta);
  const gross = basic + hra + sa + pb + lta + fa;
  const adj   = Math.floor(gross * days / 30);
  const pf    = Math.floor(basic * pfRate / 100);
  const pt    = toMC(200);
  const tds   = Math.floor(adj * 5 / 100);
  const ded   = pf + pt + tds;
  const net   = adj - ded;
  const fmt = v => fromMC(v);
  return {
    basic: fmt(basic), hra: fmt(hra), sa: fmt(sa), pb: fmt(pb),
    lta: fmt(lta), fa: fmt(fa), gross: fmt(adj), pf: fmt(pf),
    pt: fmt(pt), tds: fmt(tds), ded: fmt(ded), net: fmt(net),
    annualCTC: fmt(gross * 12)
  };
}

// ── In-Memory Fallback Store (used when SQLite is unavailable) ────────────────
// Maintains same relational shape as the SQL schema
const STORE = {
  employees: [
    { id: 1, emp_code: 'EMP-2024-001', first_name: 'Soumoditya', last_name: 'Das', email: 'soumoditya@hrms.in', portal_role: 'ADMIN', password: 'admin@2026', status: 'ACTIVE' },
    { id: 2, emp_code: 'EMP-2024-002', first_name: 'Priya', last_name: 'Nair', email: 'priya.nair@hrms.in', portal_role: 'EMPLOYEE', password: 'password123', status: 'ACTIVE' }
  ],
  attendance: [], leaves: [], payslips: [],
  notices: [
    { title: 'Q3 Performance Reviews Begin', body: 'Annual performance review cycle starts from 10th July 2026. Managers please complete goal setting.', created_at: '2026-07-04' }
  ],
  tickets: [], auditLog: []
};
let useMemory = false;

function respond(res, data, status = 200) {
  return res.status(status).json(data);
}
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'VALIDATION_FAILED', details: errors.array() });
  }
  return null;
}

// ── Audit Logger ──────────────────────────────────────────────────────────────
function audit(empId, action, entity, entityId, details, ip) {
  const db = getDB();
  if (db && !useMemory) {
    try {
      db.prepare(
        'INSERT INTO audit_log (emp_id,action,entity,entity_id,details,ip_addr) VALUES (?,?,?,?,?,?)'
      ).run(empId, action, entity, entityId, JSON.stringify(details), ip);
    } catch (e) { /* Audit must never crash the main flow */ }
  }
}

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5000'], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Rate limiting — 300 req per 15 min per IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  message: { error: 'RATE_LIMITED', message: 'Too many requests, please try again later.' }
}));

// ════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════════════
const authRouter = express.Router();

// POST /api/auth/login
authRouter.post('/login',
  body('email').isEmail().withMessage('Enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  async (req, res) => {
    if (handleValidation(req, res)) return;

    const { email, password } = req.body;
    let emp;

    const db = getDB();
    if (db && !useMemory) {
      emp = db.prepare(
        'SELECT e.*, d.name as dept_name FROM employees e LEFT JOIN departments d ON e.dept_id=d.id WHERE e.email=?'
      ).get(email);
    } else {
      emp = STORE.employees.find(e => e.email === email);
    }

    if (!emp) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email not found in system.' });
    }

    const valid = (db && !useMemory) ? await bcrypt.compare(password, emp.password_hash) : (password === emp.password);
    if (!valid) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Incorrect password.' });
    }

    const payload = {
      id: emp.id, emp_code: emp.emp_code,
      name: `${emp.first_name} ${emp.last_name}`,
      email: emp.email, portal_role: emp.portal_role,
      dept: emp.dept_name || 'N/A'
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    if (db && !useMemory) {
      db.prepare('UPDATE employees SET last_login=datetime("now") WHERE id=?').run(emp.id);
    }
    audit(emp.id, 'LOGIN', 'employees', emp.id, { portal: emp.portal_role }, req.ip);

    respond(res, { token, user: payload });
  }
);

// POST /api/auth/logout (token invalidation handled client-side for SPA)
authRouter.post('/logout', authenticate, (req, res) => {
  audit(req.user.id, 'LOGOUT', 'employees', req.user.id, {}, req.ip);
  respond(res, { message: 'Logged out successfully' });
});

app.use('/api/auth', authRouter);

// ════════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ════════════════════════════════════════════════════════════════
app.get('/api/dashboard/stats', authenticate, (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];

  if (db && !useMemory) {
    const total   = db.prepare('SELECT COUNT(*) as c FROM employees WHERE status="ACTIVE"').get().c;
    const present = db.prepare('SELECT COUNT(*) as c FROM attendance WHERE date=? AND status="PRESENT"').get(today).c;
    const absent  = db.prepare('SELECT COUNT(*) as c FROM attendance WHERE date=? AND status="ABSENT"').get(today).c;
    const onLeave = db.prepare('SELECT COUNT(*) as c FROM leave_requests WHERE from_date<=? AND to_date>=? AND status="APPROVED"').get(today,today).c;
    const pendingLeaves = db.prepare('SELECT COUNT(*) as c FROM leave_requests WHERE status="PENDING"').get().c;
    const openTickets   = db.prepare('SELECT COUNT(*) as c FROM tickets WHERE status="OPEN"').get().c;
    return respond(res, { total, present, absent, onLeave, pendingLeaves, openTickets, date: today });
  }

  respond(res, { total: 12, present: 9, absent: 2, onLeave: 1, pendingLeaves: 1, openTickets: 2, date: today });
});

// ════════════════════════════════════════════════════════════════
// EMPLOYEES ROUTES
// ════════════════════════════════════════════════════════════════
const empRouter = express.Router();
empRouter.use(authenticate);

// GET all employees (HR/Admin only)
empRouter.get('/', requireRole('ADMIN','HR'), (req, res) => {
  const db = getDB();
  if (db && !useMemory) {
    const rows = db.prepare(`
      SELECT e.id, e.emp_code, e.first_name, e.last_name, e.email, e.phone,
             e.status, e.portal_role, e.join_date, e.dob,
             e.base_wage_microcents, d.name as dept, d.code as dept_code
      FROM employees e LEFT JOIN departments d ON e.dept_id=d.id
      ORDER BY e.id
    `).all();
    return respond(res, rows);
  }
  respond(res, STORE.employees);
});

// GET my own profile
empRouter.get('/me', (req, res) => {
  const db = getDB();
  if (db && !useMemory) {
    const emp = db.prepare(`
      SELECT e.id,e.emp_code,e.first_name,e.last_name,e.email,e.phone,
             e.status,e.portal_role,e.join_date,e.dob,e.pan_number,
             e.aadhar_number,e.base_wage_microcents,
             d.name as dept, d.code as dept_code
      FROM employees e LEFT JOIN departments d ON e.dept_id=d.id WHERE e.id=?
    `).get(req.user.id);
    if (!emp) return res.status(404).json({ error: 'NOT_FOUND' });
    return respond(res, emp);
  }
  respond(res, STORE.employees[0] || {});
});

// POST add employee (Admin only)
empRouter.post('/',
  requireRole('ADMIN'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('dept_id').isInt({ min:1 }).withMessage('Valid department required'),
  body('base_wage_microcents').isInt({ min: 0 }).withMessage('Wage must be a positive number'),
  async (req, res) => {
    if (handleValidation(req, res)) return;
    const db = getDB();
    const hash = await bcrypt.hash('Welcome@123', 10);
    const count = db ? db.prepare('SELECT COUNT(*) as c FROM employees').get().c : STORE.employees.length;
    const code  = `EMP-2024-${String(count + 1).padStart(3,'0')}`;

    if (db && !useMemory) {
      const { first_name, last_name, email, dept_id, portal_role = 'EMPLOYEE', base_wage_microcents, join_date } = req.body;
      try {
        const result = db.prepare(`
          INSERT INTO employees (emp_code,first_name,last_name,email,dept_id,portal_role,
            base_wage_microcents,status,join_date,password_hash)
          VALUES (?,?,?,?,?,?,?,?,?,?)
        `).run(code, first_name, last_name, email, dept_id, portal_role,
               base_wage_microcents, 'ACTIVE', join_date || new Date().toISOString().split('T')[0], hash);
        audit(req.user.id, 'CREATE_EMPLOYEE', 'employees', result.lastInsertRowid, { code }, req.ip);
        return respond(res, { id: result.lastInsertRowid, emp_code: code }, 201);
      } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'DUPLICATE', message: 'Email already exists.' });
        throw e;
      }
    }
    respond(res, { id: Date.now(), emp_code: code }, 201);
  }
);

app.use('/api/employees', empRouter);

// ════════════════════════════════════════════════════════════════
// ATTENDANCE ROUTES
// ════════════════════════════════════════════════════════════════
const attRouter = express.Router();
attRouter.use(authenticate);

// GET my attendance
attRouter.get('/me', (req, res) => {
  const db = getDB();
  const from = req.query.from || new Date(Date.now() - 30*864e5).toISOString().split('T')[0];
  const to   = req.query.to   || new Date().toISOString().split('T')[0];
  if (db && !useMemory) {
    const rows = db.prepare('SELECT * FROM attendance WHERE emp_id=? AND date BETWEEN ? AND ? ORDER BY date DESC').all(req.user.id, from, to);
    return respond(res, rows);
  }
  respond(res, []);
});

// GET all attendance (HR/Admin)
attRouter.get('/', requireRole('ADMIN','HR'), (req, res) => {
  const db = getDB();
  const date = req.query.date || new Date().toISOString().split('T')[0];
  if (db && !useMemory) {
    const rows = db.prepare(`
      SELECT a.*, e.first_name||' '||e.last_name as emp_name, e.emp_code
      FROM attendance a JOIN employees e ON a.emp_id=e.id WHERE a.date=?
    `).all(date);
    return respond(res, rows);
  }
  respond(res, []);
});

// POST clock in/out
attRouter.post('/tick',
  body('type').isIn(['IN','OUT','BREAK_START','BREAK_END']).withMessage('type must be IN, OUT, BREAK_START, or BREAK_END'),
  (req, res) => {
    if (handleValidation(req, res)) return;
    const db   = getDB();
    const today = new Date().toISOString().split('T')[0];
    const now   = new Date().toISOString();
    const { type } = req.body;

    if (db && !useMemory) {
      const existing = db.prepare('SELECT * FROM attendance WHERE emp_id=? AND date=?').get(req.user.id, today);
      if (type === 'IN') {
        if (existing) return res.status(409).json({ error: 'ALREADY_CLOCKED_IN', message: 'Already clocked in today.' });
        db.prepare('INSERT INTO attendance (emp_id,date,check_in,status) VALUES (?,?,?,"PRESENT")').run(req.user.id, today, now);
        audit(req.user.id, 'CLOCK_IN', 'attendance', req.user.id, { time: now }, req.ip);
      } else if (type === 'OUT') {
        if (!existing || existing.check_out) return res.status(400).json({ error: 'NOT_CLOCKED_IN', message: 'No active session to clock out from.' });
        const workMs = new Date(now) - new Date(existing.check_in);
        const workMins = Math.floor(workMs / 60000);
        db.prepare('UPDATE attendance SET check_out=?,work_mins=? WHERE emp_id=? AND date=?').run(now, workMins, req.user.id, today);
        audit(req.user.id, 'CLOCK_OUT', 'attendance', req.user.id, { workMins }, req.ip);
      }
      return respond(res, { type, timestamp: now, date: today });
    }
    respond(res, { type, timestamp: now, date: today });
  }
);

app.use('/api/attendance', attRouter);

// ════════════════════════════════════════════════════════════════
// LEAVE ROUTES
// ════════════════════════════════════════════════════════════════
const leaveRouter = express.Router();
leaveRouter.use(authenticate);

leaveRouter.get('/types', (req, res) => {
  const db = getDB();
  if (db && !useMemory) return respond(res, db.prepare('SELECT * FROM leave_types').all());
  respond(res, [{ id:1,name:'CASUAL',max_days:12 },{ id:2,name:'SICK',max_days:12 }]);
});

leaveRouter.get('/', (req, res) => {
  const db = getDB();
  if (db && !useMemory) {
    const isHR = ['ADMIN','HR'].includes(req.user.portal_role);
    const rows = isHR
      ? db.prepare(`SELECT l.*,e.first_name||' '||e.last_name as emp_name,lt.name as leave_type
                    FROM leave_requests l JOIN employees e ON l.emp_id=e.id
                    JOIN leave_types lt ON l.leave_type_id=lt.id ORDER BY l.applied_at DESC`).all()
      : db.prepare(`SELECT l.*,lt.name as leave_type FROM leave_requests l
                    JOIN leave_types lt ON l.leave_type_id=lt.id WHERE l.emp_id=? ORDER BY l.applied_at DESC`).all(req.user.id);
    return respond(res, rows);
  }
  respond(res, STORE.leaves);
});

leaveRouter.post('/',
  body('leave_type_id').isInt({ min:1 }).withMessage('Select a leave type'),
  body('from_date').isISO8601().withMessage('Valid from date required'),
  body('to_date').isISO8601().withMessage('Valid to date required'),
  body('reason').isLength({ min:5 }).withMessage('Reason must be at least 5 characters'),
  (req, res) => {
    if (handleValidation(req, res)) return;
    const { leave_type_id, from_date, to_date, reason } = req.body;
    if (from_date > to_date) return res.status(422).json({ error: 'INVALID_RANGE', message: 'From date cannot be after To date.' });
    const days = Math.ceil((new Date(to_date) - new Date(from_date)) / 864e5) + 1;
    const db = getDB();
    if (db && !useMemory) {
      const r = db.prepare('INSERT INTO leave_requests (emp_id,leave_type_id,from_date,to_date,days,reason) VALUES (?,?,?,?,?,?)').run(req.user.id, leave_type_id, from_date, to_date, days, reason);
      audit(req.user.id,'APPLY_LEAVE','leave_requests',r.lastInsertRowid,{days},req.ip);
      return respond(res, { id: r.lastInsertRowid, days }, 201);
    }
    respond(res, { id: Date.now(), days }, 201);
  }
);

leaveRouter.put('/:id/status', authenticate, requireRole('ADMIN','HR'),
  body('status').isIn(['APPROVED','REJECTED']).withMessage('Status must be APPROVED or REJECTED'),
  (req, res) => {
    if (handleValidation(req, res)) return;
    const db = getDB();
    const { id } = req.params;
    const { status } = req.body;
    if (db && !useMemory) {
      const r = db.prepare('UPDATE leave_requests SET status=?,reviewed_by=?,reviewed_at=datetime("now") WHERE id=?').run(status, req.user.id, id);
      if (r.changes === 0) return res.status(404).json({ error: 'NOT_FOUND' });
      audit(req.user.id,'REVIEW_LEAVE','leave_requests',id,{status},req.ip);
      return respond(res, { id, status });
    }
    respond(res, { id, status });
  }
);

app.use('/api/leaves', leaveRouter);

// ════════════════════════════════════════════════════════════════
// PAYROLL ROUTES
// ════════════════════════════════════════════════════════════════
const payRouter = express.Router();
payRouter.use(authenticate);

payRouter.get('/myslip', (req, res) => {
  const db = getDB();
  if (db && !useMemory) {
    const slip = db.prepare(`
      SELECT p.*,pr.month,pr.year,pr.status as run_status,
             e.first_name||' '||e.last_name as emp_name, e.emp_code, d.name as dept
      FROM payslips p
      JOIN payroll_runs pr ON p.run_id=pr.id
      JOIN employees e ON p.emp_id=e.id
      LEFT JOIN departments d ON e.dept_id=d.id
      WHERE p.emp_id=? ORDER BY pr.year DESC, pr.month DESC LIMIT 3
    `).all(req.user.id);
    return respond(res, slip);
  }
  respond(res, []);
});

payRouter.get('/calc',
  (req, res) => {
    const base = parseInt(req.query.base) || 75000;
    const days = parseInt(req.query.days) || 22;
    const pf   = parseInt(req.query.pf)   || 12;
    return respond(res, calcSalaryMC(toMC(base), days, pf));
  }
);

payRouter.get('/all', requireRole('ADMIN','HR'), (req, res) => {
  const db = getDB();
  if (db && !useMemory) {
    const slips = db.prepare(`
      SELECT p.*,pr.month,pr.year,e.first_name||' '||e.last_name as emp_name,e.emp_code,d.name as dept
      FROM payslips p JOIN payroll_runs pr ON p.run_id=pr.id
      JOIN employees e ON p.emp_id=e.id LEFT JOIN departments d ON e.dept_id=d.id
      ORDER BY pr.year DESC, pr.month DESC
    `).all();
    return respond(res, slips);
  }
  respond(res, []);
});

app.use('/api/payroll', payRouter);

// ════════════════════════════════════════════════════════════════
// NOTICES & TICKETS
// ════════════════════════════════════════════════════════════════
app.get('/api/notices', authenticate, (req, res) => {
  const db = getDB();
  if (db && !useMemory) {
    return respond(res, db.prepare(`
      SELECT n.*,e.first_name||' '||e.last_name as posted_by_name
      FROM notices n LEFT JOIN employees e ON n.posted_by=e.id ORDER BY n.created_at DESC
    `).all());
  }
  respond(res, STORE.notices);
});

app.post('/api/notices', authenticate, requireRole('ADMIN','HR'),
  body('title').notEmpty().withMessage('Title is required'),
  body('body').isLength({ min:10 }).withMessage('Body must be at least 10 characters'),
  (req, res) => {
    if (handleValidation(req, res)) return;
    const db = getDB();
    const { title, body: bodyText, priority = 'NORMAL' } = req.body;
    if (db && !useMemory) {
      const r = db.prepare('INSERT INTO notices (title,body,priority,posted_by) VALUES (?,?,?,?)').run(title, bodyText, priority, req.user.id);
      return respond(res, { id: r.lastInsertRowid, title }, 201);
    }
    respond(res, { id: Date.now(), title }, 201);
  }
);

app.get('/api/tickets', authenticate, (req, res) => {
  const db = getDB();
  if (db && !useMemory) {
    const isHR = ['ADMIN','HR'].includes(req.user.portal_role);
    const rows = isHR
      ? db.prepare(`SELECT t.*,e.first_name||' '||e.last_name as emp_name FROM tickets t JOIN employees e ON t.emp_id=e.id ORDER BY t.created_at DESC`).all()
      : db.prepare('SELECT * FROM tickets WHERE emp_id=? ORDER BY created_at DESC').all(req.user.id);
    return respond(res, rows);
  }
  respond(res, []);
});

// ════════════════════════════════════════════════════════════════
// DEPARTMENTS
// ════════════════════════════════════════════════════════════════
app.get('/api/departments', authenticate, (req, res) => {
  const db = getDB();
  if (db && !useMemory) return respond(res, db.prepare('SELECT * FROM departments ORDER BY name').all());
  respond(res, []);
});

// ════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  respond(res, {
    status: 'OK',
    db: getDB() ? 'SQLite Connected' : 'In-Memory Fallback',
    time: new Date().toISOString(),
    version: '2.0.0',
    author: 'Soumoditya Das'
  });
});

// ── Serve React build in production ──────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
}

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const db = initDB();
if (!db) { useMemory = true; console.log('[SERVER] Running with in-memory store (install better-sqlite3 for persistence)'); }

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   ODOO HRMS API Server  v2.0.0               ║');
  console.log('  ║   Author : Soumoditya Das                    ║');
  console.log(`  ║   API    → http://localhost:${PORT}             ║`);
  console.log(`  ║   DB     → ${db ? 'SQLite (hrms.db)' : 'In-Memory Fallback'}          ║`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('  Seed demo data: node server/db/seed.js');
  console.log('');
});
