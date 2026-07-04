// ─────────────────────────────────────────────────────────────────────────────
// HRMS Portal Static Server — Port 5000
// Serves the complete SPA + all API routes
// Author: Soumoditya Das | Zero-dependency Node.js native http
// ─────────────────────────────────────────────────────────────────────────────
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { createHmac, randomBytes } = require('crypto');

const PORT = 5000;
const PORTAL_DIR = path.join(__dirname, 'portal');

// ── MIME types ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ── In-memory data store (Indian Names) ──────────────────────────────────────
const DB = {
  employees: [
    { id:1, name:'Soumoditya Das', code:'EMP-2024-001', dept:'Engineering', role:'Principal Engineer', status:'PRESENT',  joined:'2022-01-15', wage:185000 },
    { id:2, name:'Aarav Patel',    code:'EMP-2024-002', dept:'HR',          role:'HR Director',        status:'PRESENT',  joined:'2023-02-01', wage:145000 },
    { id:3, name:'Priya Sharma',   code:'EMP-2024-003', dept:'Finance',     role:'Finance Lead',       status:'ABSENT',   joined:'2024-03-10', wage:95000 },
    { id:4, name:'Rohan Verma',    code:'EMP-2024-004', dept:'Marketing',   role:'Marketing Head',     status:'ON_LEAVE', joined:'2024-04-05', wage:88000 },
    { id:5, name:'Sneha Gupta',    code:'EMP-2024-005', dept:'Engineering', role:'Frontend Engineer',  status:'PRESENT',  joined:'2024-05-01', wage:75000 },
    { id:6, name:'Vikram Singh',   code:'EMP-2024-006', dept:'Engineering', role:'Backend Engineer',   status:'PRESENT',  joined:'2024-06-01', wage:85000 },
    { id:7, name:'Ananya Iyer',    code:'EMP-2024-007', dept:'Design',      role:'UX Researcher',      status:'PRESENT',  joined:'2024-06-15', wage:65000 },
    { id:8, name:'Karan Malhotra', code:'EMP-2024-008', dept:'Sales',       role:'Sales Executive',    status:'PRESENT',  joined:'2024-07-01', wage:55000 },
  ],
  attendance: [],
  leaves: [
    { id:1, empId:3, type:'SICK', from:'2026-07-04', to:'2026-07-05', days:2, applied:'2026-07-03', status:'PENDING' },
    { id:2, empId:4, type:'CASUAL', from:'2026-07-01', to:'2026-07-05', days:5, applied:'2026-06-25', status:'APPROVED' },
  ],
  payslips: [],
  sessions: new Map(),
};

// ── Pure integer salary calculator ───────────────────────────────────────────
function calcSalary(base, days = 22, pfRate = 12) {
  const m = Math.round(base * 1_000_000);
  const basic = Math.floor(m * 50 / 100);
  const hra   = Math.floor(basic * 50 / 100);
  const sa    = 416_700_000;
  const pb    = Math.floor(basic * 833 / 10_000);
  const lta   = Math.floor(basic * 8333 / 100_000);
  const fa    = Math.max(0, m - basic - hra - sa - pb - lta);
  const gross = basic + hra + sa + pb + lta + fa;
  const pf    = Math.floor(basic * pfRate / 100);
  const pt    = 200_000_000;
  const tds   = Math.floor(gross * 0.05);
  const ded   = pf + pt + tds;
  const adjusted = Math.floor(gross * days / 30);
  const net   = adjusted - ded;
  const μ = v => parseFloat((v / 1_000_000).toFixed(2));
  return { basic:μ(basic), hra:μ(hra), sa:μ(sa), pb:μ(pb), lta:μ(lta), fa:μ(fa),
           gross:μ(adjusted), pf:μ(pf), pt:μ(pt), tds:μ(tds), ded:μ(ded),
           net:μ(net), annualCTC:μ(gross * 12) };
}

// ── JSON helpers ─────────────────────────────────────────────────────────────
function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) reject(new Error('Too large')); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

// ── HMAC auth token ──────────────────────────────────────────────────────────
const SECRET = 'hrms-odoo-hackathon-2026-soumoditya';
function signToken(id, mask, portal) {
  const payload = `${id}:${mask}:${portal}:${Date.now()}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64');
}

// ── Memory attendance batcher ────────────────────────────────────────────────
let attQueue = [];
function flushAttQueue() {
  if (!attQueue.length) return;
  const batch = attQueue.splice(0);
  batch.forEach(tick => {
    const existing = DB.attendance.find(a => a.empId === tick.empId && a.date === tick.date);
    if (tick.type === 'IN') {
      if (!existing) DB.attendance.push({ empId: tick.empId, date: tick.date, checkIn: tick.ts, checkOut: null, workMs: 0 });
    } else if (tick.type === 'OUT' && existing) {
      existing.checkOut = tick.ts;
      existing.workMs = new Date(tick.ts) - new Date(existing.checkIn);
    }
  });
}
setInterval(flushAttQueue, 50);

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url  = new URL(req.url, `http://localhost:${PORT}`);
  const path_ = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  // ── API ROUTES ────────────────────────────────────────────────────────────
  if (path_.startsWith('/api')) {

    if (path_ === '/api/health' && req.method === 'GET') {
      return json(res, { status:'OK', time: new Date().toISOString(), service:'HRMS Core' });
    }

    if (path_ === '/api/auth/login' && req.method === 'POST') {
      const { email, password, portal } = await readBody(req);
      // Dummy validation for Hackathon
      const token = signToken('emp-001', 31, portal || 'admin');
      DB.sessions.set(token, { id:'emp-001', mask:31, portal });
      return json(res, { token, name:'Soumoditya Das', role:'ADMIN', portal });
    }

    if (path_ === '/api/employees' && req.method === 'GET') {
      return json(res, DB.employees);
    }
    
    if (path_ === '/api/stats' && req.method === 'GET') {
      return json(res, {
        total: DB.employees.length,
        present: DB.employees.filter(e => e.status === 'PRESENT').length,
        absent: DB.employees.filter(e => e.status === 'ABSENT').length,
        leaves: DB.leaves.length
      });
    }

    return json(res, { error: 'NOT_FOUND' }, 404);
  }

  // ── STATIC FILE SERVING ───────────────────────────────────────────────────
  let filePath = path.join(PORTAL_DIR, path_ === '/' ? 'index.html' : path_);
  if (!filePath.startsWith(PORTAL_DIR)) {
    return json(res, { error: 'FORBIDDEN' }, 403);
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(PORTAL_DIR, 'index.html'), (e2, fallback) => {
        if (e2) { res.writeHead(500); return res.end('Internal Error'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fallback);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   ODOO HRMS — ENTERPRISE PORTAL              ║');
  console.log('  ║   Author : Soumoditya Das                    ║');
  console.log('  ║   Portal → http://localhost:5000             ║');
  console.log('  ╚══════════════════════════════════════════════╝');
});
