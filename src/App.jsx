import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// ── Rich Mock Data ─────────────────────────────────────────────────────────────
const MOCK_EMPLOYEES = [
  { id:1, emp_code:'EMP-001', first_name:'Soumoditya', last_name:'Das', email:'soumoditya@hrms.in', portal_role:'ADMIN', dept:'Engineering', desig:'L1 Engineer', status:'ACTIVE', joined:'2024-01-15', avatar:'SD', color:'#6366f1' },
  { id:2, emp_code:'EMP-002', first_name:'Priya', last_name:'Nair', email:'priya.nair@hrms.in', portal_role:'EMPLOYEE', dept:'HR', desig:'HR Manager', status:'ACTIVE', joined:'2024-02-10', avatar:'PN', color:'#10b981' },
  { id:3, emp_code:'EMP-003', first_name:'Rahul', last_name:'Sharma', email:'rahul.sharma@hrms.in', portal_role:'EMPLOYEE', dept:'Finance', desig:'Sr. Accountant', status:'ACTIVE', joined:'2023-11-05', avatar:'RS', color:'#f59e0b' },
  { id:4, emp_code:'EMP-004', first_name:'Anjali', last_name:'Mehta', email:'anjali.mehta@hrms.in', portal_role:'EMPLOYEE', dept:'Sales', desig:'Sales Executive', status:'ACTIVE', joined:'2024-03-20', avatar:'AM', color:'#ef4444' },
  { id:5, emp_code:'EMP-005', first_name:'Vikram', last_name:'Patel', email:'vikram.patel@hrms.in', portal_role:'EMPLOYEE', dept:'Engineering', desig:'Backend Dev', status:'ACTIVE', joined:'2023-09-01', avatar:'VP', color:'#3b82f6' },
  { id:6, emp_code:'EMP-006', first_name:'Neha', last_name:'Gupta', email:'neha.gupta@hrms.in', portal_role:'EMPLOYEE', dept:'Marketing', desig:'Content Lead', status:'ON_LEAVE', joined:'2024-01-28', avatar:'NG', color:'#8b5cf6' },
  { id:7, emp_code:'EMP-007', first_name:'Aditya', last_name:'Maddala', email:'aditya.m@hrms.in', portal_role:'EMPLOYEE', dept:'Engineering', desig:'Frontend Dev', status:'ACTIVE', joined:'2023-07-15', avatar:'AD', color:'#06b6d4' },
  { id:8, emp_code:'EMP-008', first_name:'Kanchan', last_name:'Kumari', email:'kanchan.k@hrms.in', portal_role:'EMPLOYEE', dept:'HR', desig:'Recruiter', status:'ACTIVE', joined:'2024-04-01', avatar:'KK', color:'#ec4899' },
];

const MOCK_LEAVES = [
  { id:1, emp_name:'Priya Nair', emp_desig:'HR Manager', leave_type:'Sick', from_date:'2026-07-03', to_date:'2026-07-03', days:1, status:'PENDING', paid:true },
  { id:2, emp_name:'Anjali Mehta', emp_desig:'Sales Executive', leave_type:'Casual', from_date:'2026-07-02', to_date:'2026-07-02', days:1, status:'APPROVED', paid:true },
  { id:3, emp_name:'Neha Gupta', emp_desig:'Content Lead', leave_type:'Privilege/Earned', from_date:'2026-07-01', to_date:'2026-07-08', days:6, status:'APPROVED', paid:true },
  { id:4, emp_name:'Rahul Sharma', emp_desig:'Sr. Accountant', leave_type:'Sick', from_date:'2026-06-30', to_date:'2026-06-30', days:1, status:'REJECTED', paid:false },
  { id:5, emp_name:'Vikram Patel', emp_desig:'Backend Dev', leave_type:'Casual', from_date:'2026-07-10', to_date:'2026-07-11', days:2, status:'PENDING', paid:true },
  { id:6, emp_name:'Kanchan Kumari', emp_desig:'Recruiter', leave_type:'Maternity', from_date:'2026-06-15', to_date:'2026-07-15', days:30, status:'APPROVED', paid:true },
];

const MOCK_ATTENDANCE_GRID = [
  { name:'Rahul Sharma', desig:'L2', avatar:'RS', color:'#f59e0b', days:['P','P','P','H','P','P','O','P','P','P','H','P','P','O','P','P','P','P','H','P','P','O','P','P','P','P','H','P','P','P','O'] },
  { name:'Anjali Mehta', desig:'L1', avatar:'AM', color:'#ef4444', days:['P','P','P','H','L','P','O','P','P','P','H','P','P','O','A','P','P','P','H','P','P','O','P','P','A','P','H','P','P','P','O'] },
  { name:'Vikram Patel', desig:'L2', avatar:'VP', color:'#3b82f6', days:['P','P','P','H','P','P','O','L','P','P','H','P','P','O','P','P','P','P','H','P','P','O','P','P','P','L','H','P','P','P','O'] },
  { name:'Neha Gupta', desig:'L3', avatar:'NG', color:'#8b5cf6', days:['L','L','L','H','L','L','O','L','L','L','H','L','L','O','L','L','L','L','H','L','L','O','L','L','L','L','H','L','L','L','O'] },
  { name:'Aditya Maddala', desig:'L1', avatar:'AD', color:'#06b6d4', days:['P','P','P','H','P','P','O','P','A','P','H','P','P','O','P','P','P','P','H','P','P','O','P','P','P','P','H','A','P','P','O'] },
  { name:'Kanchan Kumari', desig:'L2', avatar:'KK', color:'#ec4899', days:['P','P','P','H','P','P','O','P','P','P','H','P','P','O','P','L','P','P','H','P','P','O','P','P','P','P','H','P','P','P','O'] },
];

const MOCK_SHIFT = [
  { name:'Rahul Sharma', desig:'L2', avatar:'RS', color:'#f59e0b', mon:'General Shift', tue:'General Shift', wed:'General Shift', thu:'General Shift', fri:'General Shift', sat:'⭐ Saturday', sun:'⭐ Sunday' },
  { name:'Anjali Mehta', desig:'L1', avatar:'AM', color:'#ef4444', mon:'General Shift', tue:'General Shift', wed:'General Shift', thu:'General Shift', fri:'General Shift', sat:'⭐ Saturday', sun:'⭐ Sunday' },
  { name:'Vikram Patel', desig:'L2', avatar:'VP', color:'#3b82f6', mon:'Night Shift', tue:'Night Shift', wed:'Night Shift', thu:'Night Shift', fri:'Night Shift', sat:'⭐ Saturday', sun:'⭐ Sunday' },
  { name:'Neha Gupta', desig:'L3', avatar:'NG', color:'#8b5cf6', mon:'🌿 Maternity', tue:'🌿 Maternity', wed:'🌿 Maternity', thu:'🌿 Maternity', fri:'🌿 Maternity', sat:'⭐ Saturday', sun:'⭐ Sunday' },
  { name:'Aditya Maddala', desig:'L1', avatar:'AD', color:'#06b6d4', mon:'General Shift', tue:'General Shift', wed:'General Shift', thu:'General Shift', fri:'General Shift', sat:'⭐ Saturday', sun:'⭐ Sunday' },
];

const MOCK_TICKETS = [
  { id:'TKT-001', subject:'Unable to access payroll module', category:'IT Support', priority:'High', status:'OPEN', date:'2026-07-03' },
  { id:'TKT-002', subject:'Laptop keyboard not working', category:'Hardware', priority:'Medium', status:'IN_PROGRESS', date:'2026-07-02' },
  { id:'TKT-003', subject:'VPN connectivity issue', category:'Network', priority:'High', status:'RESOLVED', date:'2026-07-01' },
  { id:'TKT-004', subject:'Leave policy document request', category:'HR', priority:'Low', status:'OPEN', date:'2026-07-04' },
];

const MOCK_NOTICES = [
  { title:'Q3 Performance Reviews Begin', body:'Annual performance review cycle starts 10th July 2026. All managers must complete goal setting by EOD 9th July.', created_at:'2026-07-04', priority:'HIGH' },
  { title:'Independence Day Holiday — 15 August 2026', body:'The office will remain closed on 15th August 2026 on account of Independence Day. WFH requests must be approved by respective managers.', created_at:'2026-07-01', priority:'MEDIUM' },
  { title:'New Leave Policy Effective August 2026', body:'Revised leave policy with 18 days annual casual leave and 12 days sick leave is now effective. Please check the HRMS portal for details.', created_at:'2026-06-28', priority:'LOW' },
];

const CAL_EVENTS = {
  1: [{name:'Muhammed Shanij', color:'#10b981'},{name:'Priya Nair', color:'#ef4444'},{name:'Raheema', color:'#10b981'}],
  2: [{name:'Aditya Maddala', color:'#ef4444'},{name:'Anshul M', color:'#ef4444'},{name:'Kanchan Kumari', color:'#10b981'}],
  3: [{name:'Priya Nair', color:'#ef4444'},{name:'Raheema', color:'#10b981'},{name:'Saurabh Shende', color:'#10b981'}],
  4: [{name:'Raheema', color:'#10b981'},{name:'Shell Kaur', color:'#10b981'}],
  7: [{name:'Naheema', color:'#10b981'},{name:'Sooraj Subair', color:'#3b82f6'}],
  8: [{name:'Naheema', color:'#10b981'}],
  9: [{name:'Naheema', color:'#10b981'}],
  10: [{name:'Naheema', color:'#10b981'}],
  14: [{name:'Raheema', color:'#10b981'}],
  15: [{name:'Raheema', color:'#10b981'}],
  16: [{name:'Raheema', color:'#10b981'}],
  17: [{name:'Raheema', color:'#10b981'}],
  18: [{name:'Raheema', color:'#10b981'},{name:'Vikram Patel', color:'#3b82f6'}],
  21: [{name:'Raheema', color:'#10b981'}],
  22: [{name:'Raheema', color:'#10b981'}],
};

const PAYROLL_DATA = [
  { emp:'Rahul Sharma', emp_code:'EMP-003', dept:'Finance', basic:50000, hra:25000, da:10000, special:5000, pf:1800, pt:200, tds:4500, health:500 },
  { emp:'Anjali Mehta', emp_code:'EMP-004', dept:'Sales', basic:45000, hra:22500, da:9000, special:3500, pf:1620, pt:200, tds:3800, health:500 },
  { emp:'Vikram Patel', emp_code:'EMP-005', dept:'Engineering', basic:70000, hra:35000, da:14000, special:6000, pf:2520, pt:200, tds:8200, health:500 },
  { emp:'Aditya Maddala', emp_code:'EMP-007', dept:'Engineering', basic:55000, hra:27500, da:11000, special:4500, pf:1980, pt:200, tds:5800, health:500 },
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [portal, setPortal] = useState('admin');
  const [email, setEmail] = useState('soumoditya@hrms.in');
  const [password, setPassword] = useState('admin@2026');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hrOpen, setHrOpen] = useState(true);
  const [workOpen, setWorkOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState(PAYROLL_DATA[0]);
  const [calMonth, setCalMonth] = useState(6); // July
  const [clockedIn, setClockedIn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const timerRef = useRef(null);
  const canvasRef = useRef(null);

  const STATS = { total: MOCK_EMPLOYEES.length, present: 6, onLeave: 2, openTickets: 2 };
  const filteredEmps = MOCK_EMPLOYEES.filter(e =>
    `${e.first_name} ${e.last_name} ${e.email} ${e.dept}`.toLowerCase().includes(empSearch.toLowerCase())
  );

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (token || !canvasRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const particles = [];
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    for (let i = 0; i < 120; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x6366f1 : i % 3 === 1 ? 0x3b82f6 : 0x10b981 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30);
      mesh.userData = { vy: (Math.random() - 0.5) * 0.03, vx: (Math.random() - 0.5) * 0.02 };
      scene.add(mesh);
      particles.push(mesh);
    }
    const torusGeo = new THREE.TorusGeometry(12, 0.4, 8, 80);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, opacity: 0.3, transparent: true });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    scene.add(torus);
    camera.position.z = 30;
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      torus.rotation.x += 0.004; torus.rotation.y += 0.002;
      particles.forEach(p => { p.position.y += p.userData.vy; p.position.x += p.userData.vx; if (Math.abs(p.position.y) > 22) p.userData.vy *= -1; if (Math.abs(p.position.x) > 32) p.userData.vx *= -1; });
      renderer.render(scene, camera);
    };
    animate();
    const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); renderer.dispose(); };
  }, [token]);

  const handleLogin = (e) => {
    e.preventDefault();
    fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, portal }) })
      .then(r => { if (!r.ok) throw new Error('Invalid credentials'); return r.json(); })
      .then(d => { localStorage.setItem('token', d.token); localStorage.setItem('user', JSON.stringify(d.user)); setToken(d.token); setUser(d.user); })
      .catch(err => alert(err.message));
  };

  const handleLogout = () => { localStorage.clear(); setToken(null); setUser(null); };

  const toggleClock = () => {
    setClockedIn(c => {
      if (!c) { timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000); }
      else { clearInterval(timerRef.current); setSeconds(0); }
      return !c;
    });
  };

  const fmt = s => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = new Date();
  const firstDay = new Date(2026, calMonth, 1).getDay();
  const daysInMonth = new Date(2026, calMonth + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const calCells = Array.from({ length: 35 }, (_, i) => i < offset ? null : i - offset + 1 > daysInMonth ? null : i - offset + 1);

  const dm = darkMode;

  if (!token) {
    return (
      <div className="login-overlay">
        <canvas ref={canvasRef} className="login-canvas" />
        <div className="login-card">
          <div className="login-logo">O</div>
          <div className="login-title">Odoo HRMS Portal</div>
          <div className="login-sub">Enterprise Human Resource Management System</div>
          <div className="portal-grid">
            <button className={`portal-btn ${portal === 'admin' ? 'active' : ''}`} onClick={() => { setPortal('admin'); setEmail('soumoditya@hrms.in'); setPassword('admin@2026'); }}>
              <span className="portal-icon">🔑</span> HR / Admin
            </button>
            <button className={`portal-btn ${portal === 'employee' ? 'active' : ''}`} onClick={() => { setPortal('employee'); setEmail('priya.nair@hrms.in'); setPassword('password123'); }}>
              <span className="portal-icon">👤</span> Employee
            </button>
          </div>
          <form onSubmit={handleLogin}>
            <input type="text" className="login-field" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" className="login-field" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" className="login-btn">🔐 Secure Login</button>
          </form>
          <div style={{textAlign:'center',marginTop:'18px',color:'rgba(255,255,255,0.35)',fontSize:'11px'}}>
            Admin: soumoditya@hrms.in · admin@2026 &nbsp;|&nbsp; Emp: priya.nair@hrms.in · password123
          </div>
        </div>
      </div>
    );
  }

  const nav = (tab) => setActiveTab(tab);

  return (
    <div className={`app ${dm ? 'dark' : ''}`}>
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-icon">O</div>
          <div className="sb-company">Odoo Suite <span>Soumoditya Das</span></div>
        </div>
        <div className="sb-user">
          <div className="sb-avatar" style={{background:'linear-gradient(135deg,#6366f1,#3b82f6)'}}>SD</div>
          <div><div className="sb-uname">{user?.name || 'Soumoditya Das'}</div><div className="sb-urole">{user?.portal_role || 'ADMIN'}</div></div>
          <div className="online"></div>
        </div>
        <div style={{padding:'8px 0'}}>
          <div className={`sb-item ${activeTab==='dashboard'?'active':''}`} onClick={()=>nav('dashboard')}><span className="sb-icon">📊</span>Dashboard</div>
          <div className={`sb-item ${activeTab==='calendar'?'active':''}`} onClick={()=>nav('calendar')}><span className="sb-icon">📅</span>My Calendar</div>
          <div className={`sb-item ${activeTab==='clients'?'active':''}`} onClick={()=>nav('clients')}><span className="sb-icon">💼</span>Clients</div>

          <div className="sb-section" onClick={()=>setHrOpen(!hrOpen)} style={{cursor:'pointer'}}>
            HR <span className={`sb-arrow ${hrOpen?'open':''}`}>›</span>
          </div>
          {hrOpen && <div className="sub-nav">
            <div className={`sb-item ${activeTab==='employees'?'active':''}`} onClick={()=>nav('employees')}>Employees</div>
            <div className={`sb-item ${activeTab==='leaves'?'active':''}`} onClick={()=>nav('leaves')}>Leaves</div>
            <div className={`sb-item ${activeTab==='shift'?'active':''}`} onClick={()=>nav('shift')}>Shift Roster</div>
            <div className={`sb-item ${activeTab==='attendance'?'active':''}`} onClick={()=>nav('attendance')}>Attendance</div>
            <div className={`sb-item ${activeTab==='payroll'?'active':''}`} onClick={()=>nav('payroll')}>Payroll & Salary</div>
            <div className={`sb-item ${activeTab==='holiday'?'active':''}`} onClick={()=>nav('holiday')}>Holiday</div>
            <div className="sb-item" onClick={()=>nav('appreciation')}>Appreciation</div>
          </div>}

          <div className="sb-section" onClick={()=>setWorkOpen(!workOpen)} style={{cursor:'pointer'}}>
            Work <span className={`sb-arrow ${workOpen?'open':''}`}>›</span>
          </div>
          {workOpen && <div className="sub-nav">
            <div className={`sb-item ${activeTab==='projects'?'active':''}`} onClick={()=>nav('projects')}>Projects</div>
            <div className={`sb-item ${activeTab==='tasks'?'active':''}`} onClick={()=>nav('tasks')}>Tasks</div>
            <div className="sb-item">Timesheet</div>
          </div>}

          <div className={`sb-item ${activeTab==='tickets'?'active':''}`} onClick={()=>nav('tickets')}><span className="sb-icon">🎟️</span>Tickets</div>
          <div className="sb-item"><span className="sb-icon">🔔</span>Events</div>
          <div className="sb-item"><span className="sb-icon">💬</span>Messages</div>
          <div className={`sb-item ${activeTab==='notices'?'active':''}`} onClick={()=>nav('notices')}><span className="sb-icon">📢</span>Notice Board</div>
          <div className="sb-item"><span className="sb-icon">📖</span>Knowledge Base</div>
          <div className="sb-item"><span className="sb-icon">⚙️</span>Settings</div>
        </div>
        <div className="sb-version">v5.5.25 · Production Build</div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        <header className="topbar">
          <div className="tb-breadcrumb">
            <span style={{color:'var(--muted)',fontSize:'13px'}}>Home</span>
            <span style={{color:'var(--muted)',margin:'0 6px'}}>›</span>
            <span className="tb-title">{activeTab.charAt(0).toUpperCase()+activeTab.slice(1)}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginLeft:'auto'}}>
            <button className="icon-btn" title="Search">🔍</button>
            <button className="icon-btn" title="Notifications">🔔</button>
            <button className="icon-btn" onClick={()=>setDarkMode(!dm)} title="Toggle Dark Mode">{dm?'☀️':'🌙'}</button>
          </div>
          <div className="tb-clock"><div className="tb-time">{time}</div><div className="tb-day">Odoo Enterprise</div></div>
          <button className={`clock-btn ${clockedIn?'out':''}`} onClick={toggleClock}>{clockedIn?'⏰ Clock Out':'⏱️ Clock In'}</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </header>

        <div className="content">

          {/* ══ DASHBOARD ══ */}
          {activeTab==='dashboard' && <>
            <div className="banner">🚀 Welcome back, {user?.name || 'Soumoditya Das'}! Today is a productive working day. <span style={{marginLeft:'auto',color:'#0369a1',fontWeight:700}}>Today is a Holiday.</span></div>
            <div className="g4 mb-20">
              {[{lbl:'Total Workforce',val:STATS.total,sub:'Active Employees',cls:'blue',icon:'👥'},{lbl:'Present Today',val:STATS.present,sub:'In Office / WFH',cls:'green',icon:'✅'},{lbl:'On Leave Today',val:STATS.onLeave,sub:'Approved Leaves',cls:'orange',icon:'🏖️'},{lbl:'Open Tickets',val:STATS.openTickets,sub:'Pending Resolution',cls:'red',icon:'🎫'}].map((k,i)=>(
                <div className="card kpi" key={i}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div><div className="kpi-lbl">{k.lbl}</div><div className={`kpi-val ${k.cls}`}>{k.val}</div><div className="kpi-sub">{k.sub}</div></div>
                    <span style={{fontSize:'28px',opacity:0.25}}>{k.icon}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="g2 mb-20">
              <div className="card">
                <div className="card-hdr">Employee Profile</div>
                <div className="card-body">
                  <div className="profile-card">
                    <div className="profile-av">SD</div>
                    <div>
                      <div className="profile-name">{user?.name || 'Soumoditya Das'}</div>
                      <div className="profile-role">{user?.portal_role || 'ADMIN'} · Engineering</div>
                      <div className="profile-id">{user?.email || 'soumoditya@hrms.in'}</div>
                      <div style={{marginTop:'12px',display:'flex',gap:'20px'}}>
                        {[{v:24,l:'Days Present'},{v:2,l:'Leaves Used'},{v:3,l:'Open Tasks'}].map((s,i)=>(
                          <div key={i} style={{textAlign:'center'}}><div style={{fontSize:'22px',fontWeight:900}}>{s.v}</div><div style={{fontSize:'11px',color:'var(--muted)'}}>{s.l}</div></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{marginTop:'16px',padding:'12px',background:'var(--bg)',borderRadius:'10px',display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'4px'}}>Today's Session</div>
                      <div style={{fontSize:'24px',fontWeight:900,fontVariantNumeric:'tabular-nums'}}>{fmt(seconds)}</div>
                    </div>
                    <button className={`att-btn ${clockedIn?'att-btn-out':'att-btn-in'}`} onClick={toggleClock}>{clockedIn?'Clock Out':'Clock In'}</button>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-hdr">Notice Board <span className="badge blue">{MOCK_NOTICES.length} Notices</span></div>
                <div className="card-body">
                  {MOCK_NOTICES.map((n,i)=>(
                    <div className="notice-item" key={i}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span className={`badge ${n.priority==='HIGH'?'red':n.priority==='MEDIUM'?'orange':'gray'}`}>{n.priority}</span>
                        <div className="notice-title">{n.title}</div>
                      </div>
                      <div className="notice-meta">📅 {n.created_at}</div>
                      <div className="notice-body">{n.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="g2">
              <div className="card">
                <div className="card-hdr">On Leave Today</div>
                <div className="card-body">
                  {MOCK_EMPLOYEES.filter(e=>e.status==='ON_LEAVE').map((e,i)=>(
                    <div className="shift-row" key={i} style={{gap:'12px'}}>
                      <div className="av" style={{background:e.color}}>{e.avatar}</div>
                      <div><div style={{fontWeight:600,fontSize:'13px'}}>{e.first_name} {e.last_name}</div><div style={{fontSize:'11px',color:'var(--muted)'}}>{e.desig}</div></div>
                      <span className="badge orange" style={{marginLeft:'auto'}}>On Leave</span>
                    </div>
                  ))}
                  <div className="shift-row"><div className="av" style={{background:'#f59e0b'}}>KK</div><div><div style={{fontWeight:600,fontSize:'13px'}}>Kanchan Kumari</div><div style={{fontSize:'11px',color:'var(--muted)'}}>Recruiter · Maternity</div></div><span className="badge green" style={{marginLeft:'auto'}}>Approved</span></div>
                </div>
              </div>
              <div className="card">
                <div className="card-hdr">Today's Joinings & Anniversary</div>
                <div className="card-body">
                  {[{name:'Rahul Sharma',type:'Work Anniversary',years:3},{name:'Anjali Mehta',type:'Birthday 🎂',years:null},{name:'Vikram Patel',type:'New Joinee 🌟',years:null}].map((j,i)=>(
                    <div className="shift-row" key={i} style={{gap:'12px'}}>
                      <div className="av" style={{background:'#6366f1'}}>{j.name.split(' ').map(w=>w[0]).join('')}</div>
                      <div><div style={{fontWeight:600,fontSize:'13px'}}>{j.name}</div><div style={{fontSize:'11px',color:'var(--muted)'}}>{j.type}{j.years?` · ${j.years} Years`:''}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>}

          {/* ══ CALENDAR ══ */}
          {activeTab==='calendar' && <div className="card">
            <div className="card-hdr" style={{gap:'12px'}}>
              <button className="btn btn-outline btn-sm" onClick={()=>setCalMonth(m=>m-1)}>‹</button>
              <button className="btn btn-outline btn-sm" onClick={()=>setCalMonth(6)}>today</button>
              <button className="btn btn-outline btn-sm" onClick={()=>setCalMonth(m=>m+1)}>›</button>
              <span style={{fontWeight:800}}>July 2026</span>
              <div style={{marginLeft:'auto',display:'flex',gap:'6px'}}>
                <button className="btn btn-primary btn-sm">month</button>
                <button className="btn btn-outline btn-sm">week</button>
                <button className="btn btn-outline btn-sm">day</button>
                <button className="btn btn-outline btn-sm">list</button>
              </div>
            </div>
            <div className="cal-grid">
              {DAY_LABELS.map(d=><div className="cal-head" key={d}>{d}</div>)}
              {calCells.map((day,i)=>(
                <div className={`cal-cell ${day===today.getDate()&&calMonth===today.getMonth()?'today':''} ${!day?'other':''}`} key={i}>
                  {day && <>
                    <div className="cal-date">{day}</div>
                    {(CAL_EVENTS[day]||[]).slice(0,2).map((ev,j)=>(
                      <div className="cal-ev" key={j} style={{background:ev.color}}>✈ {ev.name}</div>
                    ))}
                    {(CAL_EVENTS[day]||[]).length>2 && <div style={{fontSize:'10px',color:'var(--muted)',padding:'2px 4px'}}>+{(CAL_EVENTS[day]||[]).length-2} more</div>}
                  </>}
                </div>
              ))}
            </div>
          </div>}

          {/* ══ EMPLOYEES ══ */}
          {activeTab==='employees' && <div className="card">
            <div className="card-hdr">
              Employee Directory
              <div style={{display:'flex',gap:'8px',marginLeft:'auto'}}>
                <div style={{position:'relative'}}>
                  <input className="fld" style={{margin:0,width:'220px',paddingLeft:'32px'}} placeholder="Search employees..." value={empSearch} onChange={e=>setEmpSearch(e.target.value)} />
                  <span style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}>🔍</span>
                </div>
                <button className="btn btn-outline btn-sm">Employee All ▾</button>
                <button className="btn btn-outline btn-sm">Designation All ▾</button>
                <button className="btn btn-outline btn-sm">🔧 Filters</button>
                <button className="btn btn-primary btn-sm">📥 Export</button>
              </div>
            </div>
            <div className="card-body tbl-wrap" style={{padding:0}}>
              <table>
                <thead><tr>
                  <th><input type="checkbox"/></th>
                  <th>Employee ID</th>
                  <th>Name & Designation</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Reporting To</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr></thead>
                <tbody>
                  {filteredEmps.map((emp,i)=>(
                    <tr key={i}>
                      <td><input type="checkbox"/></td>
                      <td style={{fontFamily:'monospace',fontWeight:700,fontSize:'12px'}}>{emp.emp_code}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          <div className="av" style={{background:emp.color}}>{emp.avatar}</div>
                          <div>
                            <div style={{fontWeight:600,fontSize:'13px'}}>{emp.first_name} {emp.last_name}</div>
                            <div style={{fontSize:'11px',color:'var(--muted)'}}>{emp.desig}</div>
                          </div>
                          {i===0&&<span className="badge blue" style={{fontSize:'9px'}}>It's you</span>}
                          {emp.joined>'2026-01-01'&&<span className="badge green" style={{fontSize:'9px'}}>New Hire</span>}
                        </div>
                      </td>
                      <td style={{fontSize:'12px'}}>{emp.email}</td>
                      <td><span className="badge gray">{emp.dept}</span></td>
                      <td style={{color:'var(--muted)',fontSize:'12px'}}>--</td>
                      <td><span className={`badge ${emp.status==='ACTIVE'?'green':emp.status==='ON_LEAVE'?'orange':'red'}`}>● {emp.status==='ACTIVE'?'Active':emp.status==='ON_LEAVE'?'On Leave':'Inactive'}</span></td>
                      <td><button className="btn btn-outline btn-xs">⋯</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ LEAVES ══ */}
          {activeTab==='leaves' && <div className="card">
            <div className="card-hdr">
              Leave Requests
              <div style={{display:'flex',gap:'8px',marginLeft:'auto'}}>
                <button className="btn btn-primary btn-sm">+ New Leave</button>
                <button className="btn btn-outline btn-sm">📥 Export</button>
                <button className="btn btn-outline btn-sm">Duration ▾</button>
                <button className="btn btn-outline btn-sm">🔧 Filters</button>
              </div>
            </div>
            <div className="card-body tbl-wrap" style={{padding:0}}>
              <table>
                <thead><tr>
                  <th><input type="checkbox"/></th>
                  <th>Employee</th>
                  <th>Leave Date</th>
                  <th>Duration</th>
                  <th>Leave Status</th>
                  <th>Leave Type</th>
                  <th>Paid</th>
                  <th>Action</th>
                </tr></thead>
                <tbody>
                  {MOCK_LEAVES.map((l,i)=>(
                    <tr key={i}>
                      <td><input type="checkbox"/></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div className="av av-sm" style={{background:'#6366f1'}}>{l.emp_name.split(' ').map(w=>w[0]).join('')}</div>
                          <div><div style={{fontWeight:600,fontSize:'13px'}}>{l.emp_name}</div><div style={{fontSize:'11px',color:'var(--muted)'}}>{l.emp_desig}</div></div>
                        </div>
                      </td>
                      <td style={{fontSize:'12px'}}>{l.from_date} {l.days>1&&<span className="badge blue" style={{fontSize:'9px'}}>{l.days} Days</span>}</td>
                      <td>{l.days===0.5?'Half Day':'Full Day'}</td>
                      <td><span className={`badge ${l.status==='APPROVED'?'green':l.status==='PENDING'?'orange':'red'}`}>● {l.status}</span></td>
                      <td><span className={`badge ${l.leave_type==='Sick'?'red':l.leave_type==='Casual'?'gray':l.leave_type==='Maternity'?'blue':'orange'}`}>{l.leave_type}</span></td>
                      <td>{l.paid?<span className="badge green">Paid</span>:<span className="badge gray">Unpaid</span>}</td>
                      <td><button className="btn btn-outline btn-xs">⋯</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ SHIFT ROSTER ══ */}
          {activeTab==='shift' && <div className="card">
            <div className="card-hdr">
              Shift Roster — Week Jun 30 – Jul 5, 2026
              <div style={{display:'flex',gap:'8px',marginLeft:'auto'}}>
                <button className="btn btn-outline btn-sm">Employee All ▾</button>
                <button className="btn btn-outline btn-sm">Department All ▾</button>
                <button className="btn btn-outline btn-sm">Weekly View ▾</button>
                <button className="btn btn-primary btn-sm">📥 Export</button>
              </div>
            </div>
            <div className="card-body tbl-wrap" style={{padding:0}}>
              <table>
                <thead><tr>
                  <th>Employee</th>
                  {['Mon 30','Tue 1','Wed 2','Thu 3','Fri 4','Sat 5','Sun 6'].map(d=><th key={d}>{d}</th>)}
                </tr></thead>
                <tbody>
                  {MOCK_SHIFT.map((s,i)=>(
                    <tr key={i}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div className="av av-sm" style={{background:s.color}}>{s.avatar}</div>
                          <div><div style={{fontWeight:600,fontSize:'13px'}}>{s.name}</div><div style={{fontSize:'11px',color:'var(--muted)'}}>{s.desig}</div></div>
                        </div>
                      </td>
                      {[s.mon,s.tue,s.wed,s.thu,s.fri,s.sat,s.sun].map((sh,j)=>(
                        <td key={j}>
                          <div style={{background: sh.includes('General')?'#eff6ff':sh.includes('Night')?'#1e1b4b':sh.includes('Maternity')?'#d1fae5':sh.includes('Saturday')||sh.includes('Sunday')?'#f8fafc':'#fef3c7', color: sh.includes('Night')?'#fff':sh.includes('Saturday')||sh.includes('Sunday')?'var(--muted)':'var(--text)', borderRadius:'6px', padding:'4px 8px', fontSize:'11px', fontWeight:600, whiteSpace:'nowrap'}}>
                            {sh}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ ATTENDANCE ══ */}
          {activeTab==='attendance' && <>
            <div className="card mb-20">
              <div className="card-hdr">
                Attendance — July 2026
                <div style={{display:'flex',gap:'8px',marginLeft:'auto'}}>
                  <button className="btn btn-primary btn-sm">✔ Mark Attendance</button>
                  <button className="btn btn-outline btn-sm">📥 Import</button>
                  <button className="btn btn-outline btn-sm">📥 Export</button>
                  <button className="btn btn-outline btn-sm">Employee All ▾</button>
                  <button className="btn btn-outline btn-sm">Month: July ▾</button>
                </div>
              </div>
              <div style={{padding:'8px 16px',background:'var(--bg)',fontSize:'12px',display:'flex',gap:'16px',alignItems:'center',flexWrap:'wrap',borderBottom:'1px solid var(--border)'}}>
                {[{sym:'⭐',lbl:'Holiday'},{sym:'🔴',lbl:'Day Off'},{sym:'✔',lbl:'Present'},{sym:'✈',lbl:'On Leave'},{sym:'🌟',lbl:'Half Day'},{sym:'⏰',lbl:'Late'},{sym:'✖',lbl:'Absent'}].map((l,i)=>(
                  <span key={i} style={{display:'flex',alignItems:'center',gap:'4px',color:'var(--muted)'}}><span>{l.sym}</span>{l.lbl}</span>
                ))}
              </div>
              <div className="card-body tbl-wrap" style={{padding:0}}>
                <table style={{fontSize:'11px'}}>
                  <thead><tr>
                    <th style={{minWidth:'180px'}}>Employee</th>
                    {Array.from({length:31},(_,i)=><th key={i} style={{padding:'6px 4px',textAlign:'center',minWidth:'28px'}}>{i+1}</th>)}
                    <th>Total</th>
                  </tr></thead>
                  <tbody>
                    {MOCK_ATTENDANCE_GRID.map((emp,i)=>{
                      const present = emp.days.filter(d=>d==='P').length;
                      return (
                        <tr key={i}>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <div className="av av-sm" style={{background:emp.color}}>{emp.avatar}</div>
                              <div><div style={{fontWeight:600}}>{emp.name}</div><div style={{color:'var(--muted)'}}>{emp.desig}</div></div>
                            </div>
                          </td>
                          {emp.days.map((d,j)=>(
                            <td key={j} style={{textAlign:'center',padding:'4px 2px'}}>
                              <span title={d==='P'?'Present':d==='A'?'Absent':d==='L'?'On Leave':d==='H'?'Holiday':'Day Off'}
                                style={{color:d==='P'?'#10b981':d==='A'?'#ef4444':d==='L'?'#f59e0b':d==='H'?'#fbbf24':'#94a3b8',fontWeight:700}}>
                                {d==='P'?'✔':d==='A'?'✖':d==='L'?'✈':d==='H'?'⭐':'○'}
                              </span>
                            </td>
                          ))}
                          <td style={{fontWeight:700,color:'var(--accent)',textAlign:'center'}}>{present}/{emp.days.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="att-hero">
              <div className="att-timer">{fmt(seconds)}</div>
              <div className="att-lbl">Today's Active Session Duration</div>
              <div className="att-btns">
                <button className="att-btn att-btn-in" disabled={clockedIn} onClick={toggleClock}>⏱️ Clock In</button>
                <button className="att-btn att-btn-out" disabled={!clockedIn} onClick={toggleClock}>⏰ Clock Out</button>
              </div>
            </div>
          </>}

          {/* ══ PAYROLL ══ */}
          {activeTab==='payroll' && <>
            <div className="banner" style={{background:'#f0fdf4',color:'#166534',borderColor:'#bbf7d0'}}>
              💰 July 2026 Payroll Processed Successfully. {PAYROLL_DATA.length} payslips generated.
            </div>
            <div className="g2 mb-20">
              <div className="card">
                <div className="card-hdr">Select Employee</div>
                <div className="card-body" style={{padding:0}}>
                  {PAYROLL_DATA.map((p,i)=>(
                    <div key={i} className="shift-row" style={{padding:'12px 16px',cursor:'pointer',background:selectedPayroll===p?'var(--sb-active)':''}} onClick={()=>setSelectedPayroll(p)}>
                      <div className="av av-sm" style={{background:'#6366f1'}}>{p.emp.split(' ').map(w=>w[0]).join('')}</div>
                      <div>
                        <div style={{fontWeight:600,fontSize:'13px',color:selectedPayroll===p?'#fff':'var(--text)'}}>{p.emp}</div>
                        <div style={{fontSize:'11px',color:selectedPayroll===p?'rgba(255,255,255,0.6)':'var(--muted)'}}>{p.emp_code} · {p.dept}</div>
                      </div>
                      <div style={{marginLeft:'auto',fontWeight:700,color:selectedPayroll===p?'#10b981':'var(--accent)',fontSize:'13px'}}>
                        ₹ {((p.basic+p.hra+p.da+p.special)-(p.pf+p.pt+p.tds+p.health)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-hdr">Payslip — July 2026 (INR) <span className="badge blue">{selectedPayroll.emp}</span></div>
                <div className="card-body">
                  <div className="g2">
                    <div>
                      <div style={{fontSize:'12px',fontWeight:700,color:'var(--muted)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Earnings</div>
                      {[['Basic Salary',selectedPayroll.basic],['HRA (House Rent Allowance)',selectedPayroll.hra],['DA (Dearness Allowance)',selectedPayroll.da],['Special Allowance',selectedPayroll.special]].map(([k,v])=>(
                        <div className="shift-row between" key={k}><span style={{fontSize:'12px'}}>{k}</span><span className="font-bold">₹ {v.toLocaleString('en-IN')}.00</span></div>
                      ))}
                      <div className="shift-row between" style={{background:'#f0fdf4',borderRadius:'8px',padding:'10px',marginTop:'8px'}}>
                        <span className="font-bold">Gross Earnings</span>
                        <span className="font-bold" style={{color:'var(--success)'}}>₹ {(selectedPayroll.basic+selectedPayroll.hra+selectedPayroll.da+selectedPayroll.special).toLocaleString('en-IN')}.00</span>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:'12px',fontWeight:700,color:'var(--muted)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Deductions</div>
                      {[['PF (Provident Fund)',selectedPayroll.pf],['Professional Tax',selectedPayroll.pt],['TDS (Tax Deducted at Source)',selectedPayroll.tds],['Health Insurance',selectedPayroll.health]].map(([k,v])=>(
                        <div className="shift-row between" key={k}><span style={{fontSize:'12px'}}>{k}</span><span className="font-bold">₹ {v.toLocaleString('en-IN')}.00</span></div>
                      ))}
                      <div className="shift-row between" style={{background:'#fef2f2',borderRadius:'8px',padding:'10px',marginTop:'8px'}}>
                        <span className="font-bold">Total Deductions</span>
                        <span className="font-bold" style={{color:'var(--danger)'}}>₹ {(selectedPayroll.pf+selectedPayroll.pt+selectedPayroll.tds+selectedPayroll.health).toLocaleString('en-IN')}.00</span>
                      </div>
                    </div>
                  </div>
                  <div style={{marginTop:'20px',padding:'20px',background:'var(--sb)',color:'#fff',borderRadius:'14px',textAlign:'center'}}>
                    <div style={{fontSize:'12px',opacity:0.6,marginBottom:'4px'}}>Net Payable Salary</div>
                    <div style={{fontSize:'34px',fontWeight:900}}>₹ {((selectedPayroll.basic+selectedPayroll.hra+selectedPayroll.da+selectedPayroll.special)-(selectedPayroll.pf+selectedPayroll.pt+selectedPayroll.tds+selectedPayroll.health)).toLocaleString('en-IN')}.00</div>
                  </div>
                  <div style={{marginTop:'14px',display:'flex',gap:'10px'}}>
                    <button className="btn btn-primary">📄 Download PDF</button>
                    <button className="btn btn-outline">📧 Email Payslip</button>
                  </div>
                </div>
              </div>
            </div>
          </>}

          {/* ══ HOLIDAY ══ */}
          {activeTab==='holiday' && <div className="card">
            <div className="card-hdr">Holiday List — 2026</div>
            <div className="card-body tbl-wrap" style={{padding:0}}>
              <table>
                <thead><tr><th>#</th><th>Holiday Name</th><th>Date</th><th>Day</th><th>Type</th></tr></thead>
                <tbody>
                  {[{name:'Republic Day',date:'2026-01-26',day:'Monday',type:'National'},{name:'Holi',date:'2026-03-29',day:'Sunday',type:'Festival'},{name:'Good Friday',date:'2026-04-03',day:'Friday',type:'National'},{name:'Eid ul-Fitr',date:'2026-04-21',day:'Tuesday',type:'Festival'},{name:'Independence Day',date:'2026-08-15',day:'Saturday',type:'National'},{name:'Gandhi Jayanti',date:'2026-10-02',day:'Friday',type:'National'},{name:'Diwali',date:'2026-11-08',day:'Sunday',type:'Festival'},{name:'Christmas',date:'2026-12-25',day:'Friday',type:'National'}].map((h,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:700,color:'var(--muted)'}}>{i+1}</td>
                      <td style={{fontWeight:600}}>{h.name}</td>
                      <td>{h.date}</td>
                      <td>{h.day}</td>
                      <td><span className={`badge ${h.type==='National'?'blue':'orange'}`}>{h.type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ CLIENTS ══ */}
          {activeTab==='clients' && <div className="card">
            <div className="card-hdr">Client Directory <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}}>+ Add Client</button></div>
            <div className="card-body tbl-wrap" style={{padding:0}}>
              <table>
                <thead><tr><th>Client Name</th><th>Industry</th><th>Contact</th><th>Projects</th><th>Status</th></tr></thead>
                <tbody>
                  {[{name:'Authority Entrepreneurs',industry:'Consulting',contact:'authority@ent.com',projects:3,status:'Active'},{name:'Global Tech Solutions',industry:'Technology',contact:'contact@globaltech.in',projects:2,status:'Active'},{name:'Sharma & Associates',industry:'Finance',contact:'info@sharmaassoc.in',projects:1,status:'On Hold'}].map((c,i)=>(
                    <tr key={i}><td style={{fontWeight:700}}>{c.name}</td><td>{c.industry}</td><td style={{fontSize:'12px'}}>{c.contact}</td><td><span className="badge blue">{c.projects}</span></td><td><span className={`badge ${c.status==='Active'?'green':'orange'}`}>{c.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ PROJECTS ══ */}
          {activeTab==='projects' && <div className="card">
            <div className="card-hdr">
              Active Projects
              <div style={{display:'flex',gap:'8px',marginLeft:'auto'}}>
                <button className="btn btn-primary btn-sm">+ Add Project</button>
                <button className="btn btn-outline btn-sm">📥 Import</button>
                <button className="btn btn-outline btn-sm">📥 Export</button>
                <button className="btn btn-outline btn-sm">Status All ▾</button>
                <button className="btn btn-outline btn-sm">Progress ▾</button>
              </div>
            </div>
            <div className="card-body tbl-wrap" style={{padding:0}}>
              <table>
                <thead><tr><th><input type="checkbox"/></th><th>Code</th><th>Project Name</th><th>Members</th><th>Start Date</th><th>Deadline</th><th>Client</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {[{code:'PRJ-001',name:'Odoo HRMS Implementation',start:'2026-07-01',end:'2026-09-30',client:'Authority Entrepreneurs',status:'In Progress',pct:75},{code:'PRJ-002',name:'Finance Module Upgrades',start:'2026-06-15',end:'2026-08-15',client:'Global Tech Solutions',status:'On Hold',pct:30},{code:'PRJ-003',name:'Mobile HR App',start:'2026-07-04',end:'2026-12-31',client:'Sharma & Associates',status:'In Progress',pct:15}].map((p,i)=>(
                    <tr key={i}>
                      <td><input type="checkbox"/></td>
                      <td style={{fontWeight:700,color:'var(--muted)',fontSize:'12px'}}>{p.code}</td>
                      <td style={{fontWeight:600}}>{p.name}</td>
                      <td><div style={{display:'flex'}}>{['SD','PN','RS'].map((a,j)=><div key={j} className="av av-sm" style={{background:'#6366f1',marginLeft:j?'-6px':'0',border:'2px solid white'}}>{a}</div>)}</div></td>
                      <td style={{fontSize:'12px'}}>{p.start}</td>
                      <td style={{fontSize:'12px'}}>{p.end}</td>
                      <td style={{fontSize:'12px'}}>{p.client}</td>
                      <td>
                        <div><span className={`badge ${p.status==='In Progress'?'blue':'orange'}`}>{p.status}</span></div>
                        <div className="progress-bg" style={{marginTop:'4px'}}><div className="progress-fill" style={{width:`${p.pct}%`,background:p.status==='On Hold'?'var(--warning)':'var(--accent)'}}></div></div>
                      </td>
                      <td><button className="btn btn-outline btn-xs">⋯</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ TASKS ══ */}
          {activeTab==='tasks' && <div className="card">
            <div className="card-hdr">
              Tasks
              <div style={{display:'flex',gap:'8px',marginLeft:'auto'}}>
                <button className="btn btn-primary btn-sm">+ Add task</button>
                <button className="btn btn-outline btn-sm">👤 My tasks</button>
                <button className="btn btn-outline btn-sm">📥 Export</button>
                <button className="btn btn-outline btn-sm">Status ▾</button>
              </div>
            </div>
            <div className="card-body tbl-wrap" style={{padding:0}}>
              <table>
                <thead><tr><th><input type="checkbox"/></th><th>Code</th><th>Task Description</th><th>Start Date</th><th>Due Date</th><th>Hours Logged</th><th>Assigned To</th><th>Status</th></tr></thead>
                <tbody>
                  {[{code:'--',task:'Fix TDS calculation precision in Payroll Engine',start:'2026-07-01',due:'2026-07-05',hrs:'3h 14m',assign:'SD',status:'Todo',pri:'Medium'},{code:'3',task:'HRMS Database Normalization — 3NF compliance audit',start:'2026-06-25',due:'2026-07-08',hrs:'2h 50m',assign:'RS',status:'Doing',pri:'High'},{code:'2',task:'Employee Self-Service Portal Phase 2',start:'2026-06-20',due:'2026-07-15',hrs:'1h 20m',assign:'PN',status:'Todo',pri:'Low'},{code:'1',task:'CRM Setup — Automations & Pipelines',start:'2026-06-18',due:'2026-07-02',hrs:'4h 05m',assign:'AM',status:'Done',pri:'Medium'},{code:'--',task:'Attendance biometric integration spike',start:'2026-07-03',due:'2026-07-10',hrs:'0h',assign:'VP',status:'Todo',pri:'High'}].map((t,i)=>(
                    <tr key={i}>
                      <td><input type="checkbox"/></td>
                      <td style={{fontWeight:700,color:'var(--muted)',fontSize:'12px'}}>{t.code}</td>
                      <td>
                        <div style={{fontWeight:500,fontSize:'13px'}}>{t.task}</div>
                        <span className={`badge ${t.pri==='High'?'red':t.pri==='Medium'?'orange':'gray'}`} style={{fontSize:'9px',marginTop:'4px'}}>{t.pri}</span>
                      </td>
                      <td style={{fontSize:'12px',color:'var(--muted)'}}>{t.start}</td>
                      <td style={{fontSize:'12px',color:t.status!=='Done'&&t.due<'2026-07-05'?'var(--danger)':'inherit',fontWeight:t.status!=='Done'&&t.due<'2026-07-05'?700:400}}>{t.due}</td>
                      <td style={{fontSize:'12px'}}>{t.hrs}</td>
                      <td><div className="av av-sm" style={{background:'#6366f1'}}>{t.assign}</div></td>
                      <td><span className={`badge ${t.status==='Done'?'green':t.status==='Doing'?'blue':'red'}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ TICKETS ══ */}
          {activeTab==='tickets' && <div className="card">
            <div className="card-hdr">Support Tickets <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}}>+ New Ticket</button></div>
            <div className="card-body tbl-wrap" style={{padding:0}}>
              <table>
                <thead><tr><th>Ticket#</th><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Requested On</th></tr></thead>
                <tbody>
                  {MOCK_TICKETS.map((t,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:700,fontFamily:'monospace',fontSize:'12px'}}>{t.id}</td>
                      <td style={{fontWeight:500}}>{t.subject}</td>
                      <td><span className="badge gray">{t.category}</span></td>
                      <td><span className={`badge ${t.priority==='High'?'red':t.priority==='Medium'?'orange':'gray'}`}>{t.priority}</span></td>
                      <td><span className={`badge ${t.status==='OPEN'?'blue':t.status==='IN_PROGRESS'?'orange':'green'}`}>{t.status}</span></td>
                      <td style={{fontSize:'12px',color:'var(--muted)'}}>{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ NOTICES ══ */}
          {activeTab==='notices' && <div className="card">
            <div className="card-hdr">Corporate Notice Board <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}}>+ Post Notice</button></div>
            <div className="card-body">
              {MOCK_NOTICES.map((n,i)=>(
                <div className="notice-item" key={i}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                    <span className={`badge ${n.priority==='HIGH'?'red':n.priority==='MEDIUM'?'orange':'gray'}`}>{n.priority}</span>
                    <div className="notice-title" style={{fontSize:'15px',color:'var(--accent)'}}>{n.title}</div>
                  </div>
                  <div className="notice-meta">📅 Posted on {n.created_at}</div>
                  <div className="notice-body">{n.body}</div>
                </div>
              ))}
            </div>
          </div>}

        </div>
      </main>
    </div>
  );
}
