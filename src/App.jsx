import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── Payroll Engine (from spec) ────────────────────────────────────────────────
function compileSalary(wage, payableDays = 22, workingDays = 22) {
  const r = payableDays / workingDays;
  const eff = wage * r;
  const basic = Math.round(eff * 0.50);
  const hra = Math.round(basic * 0.50);
  const std = Math.round(4167 * r);
  const perf = Math.round(basic * 0.0833);
  const lta = Math.round(basic * 0.08333);
  const allocated = basic + hra + std + perf + lta;
  const fixed = Math.max(0, Math.round(eff - allocated));
  const gross = basic + hra + std + perf + lta + fixed;
  const pf = Math.round(basic * 0.12);
  const pt = eff > 15000 ? 200 : 0;
  const tds = Math.round((gross - pf - pt) * 0.10 * (gross > 250000/12 ? 1 : 0));
  const net = gross - pf - pt - tds;
  return { basic, hra, std, perf, lta, fixed, gross, pf, pt, tds, net };
}

// ─── RBAC Bitmask (from spec) ─────────────────────────────────────────────────
const PERM = { EMPLOYEE_VIEW:1, EMPLOYEE_EDIT_SELF:2, ADMIN_VIEW_ALL:4, ADMIN_EDIT_ALL:8, PAYROLL_READ:16, PAYROLL_WRITE:32 };
const ROLES_MASK = { EMPLOYEE: 3, ADMIN: 63 };
const can = (mask, perm) => (mask & perm) === perm;

// ─── Mock Data ────────────────────────────────────────────────────────────────
const EMPS = [
  { id:1, code:'OI-SOUMO-2024-0001', first:'Soumoditya', last:'Das', email:'soumoditya@hrms.in', role:'ADMIN', mask:63, dept:'Engineering', desig:'L1 Engineer', status:'PRESENT', joined:'2024-01-15', av:'SD', color:'#6366f1', wage:85000, dob:'1999-08-12', bank:'HDFC Bank', acc:'XXXX9912', ifsc:'HDFC0001234', pan:'ABCPD1234K', mobile:'+91 98765 43210', days:22 },
  { id:2, code:'OI-PRIYA-2024-0002', first:'Priya', last:'Nair', email:'priya.nair@hrms.in', role:'EMPLOYEE', mask:3, dept:'HR', desig:'HR Manager', status:'PRESENT', joined:'2024-02-10', av:'PN', color:'#10b981', wage:72000, dob:'1996-03-22', bank:'SBI', acc:'XXXX4421', ifsc:'SBIN0001234', pan:'BCDPE5678K', mobile:'+91 87654 32109', days:21 },
  { id:3, code:'OI-RAHUL-2023-0003', first:'Rahul', last:'Sharma', email:'rahul.sharma@hrms.in', role:'EMPLOYEE', mask:3, dept:'Finance', desig:'Sr. Accountant', status:'PRESENT', joined:'2023-11-05', av:'RS', color:'#f59e0b', wage:60000, dob:'1994-11-30', bank:'ICICI', acc:'XXXX7731', ifsc:'ICIC0001234', pan:'CDERF9012K', mobile:'+91 76543 21098', days:20 },
  { id:4, code:'OI-ANJAL-2024-0004', first:'Anjali', last:'Mehta', email:'anjali.mehta@hrms.in', role:'EMPLOYEE', mask:3, dept:'Sales', desig:'Sales Executive', status:'ABSENT', joined:'2024-03-20', av:'AM', color:'#ef4444', wage:54000, dob:'1998-06-14', bank:'Axis', acc:'XXXX3340', ifsc:'UTIB0001234', pan:'DEFSG3456K', mobile:'+91 65432 10987', days:18 },
  { id:5, code:'OI-VIKRA-2023-0005', first:'Vikram', last:'Patel', email:'vikram.patel@hrms.in', role:'EMPLOYEE', mask:3, dept:'Engineering', desig:'Backend Dev', status:'PRESENT', joined:'2023-09-01', av:'VP', color:'#3b82f6', wage:78000, dob:'1995-02-28', bank:'Kotak', acc:'XXXX5521', ifsc:'KKBK0001234', pan:'EFGSH7890K', mobile:'+91 54321 09876', days:22 },
  { id:6, code:'OI-NEHAG-2024-0006', first:'Neha', last:'Gupta', email:'neha.gupta@hrms.in', role:'EMPLOYEE', mask:3, dept:'Marketing', desig:'Content Lead', status:'ON_LEAVE', joined:'2024-01-28', av:'NG', color:'#8b5cf6', wage:58000, dob:'1997-09-05', bank:'HDFC', acc:'XXXX8812', ifsc:'HDFC0005678', pan:'GHIJK2345K', mobile:'+91 43210 98765', days:14 },
  { id:7, code:'OI-ADITY-2023-0007', first:'Aditya', last:'Maddala', email:'aditya.m@hrms.in', role:'EMPLOYEE', mask:3, dept:'Engineering', desig:'Frontend Dev', status:'PRESENT', joined:'2023-07-15', av:'AD', color:'#06b6d4', wage:65000, dob:'1996-12-10', bank:'SBI', acc:'XXXX6671', ifsc:'SBIN0009876', pan:'HIJKL5678K', mobile:'+91 32109 87654', days:22 },
  { id:8, code:'OI-KANCH-2024-0008', first:'Kanchan', last:'Kumari', email:'kanchan.k@hrms.in', role:'EMPLOYEE', mask:3, dept:'HR', desig:'Recruiter', status:'ON_LEAVE', joined:'2024-04-01', av:'KK', color:'#ec4899', wage:50000, dob:'1999-04-18', bank:'PNB', acc:'XXXX4430', ifsc:'PUNB0001234', pan:'IJKLM8901K', mobile:'+91 21098 76543', days:10 },
];

const LEAVES = [
  { id:1, emp:'Priya Nair', desig:'HR Manager', type:'Sick Leave', from:'2026-07-03', to:'2026-07-03', days:1, status:'PENDING', paid:true },
  { id:2, emp:'Anjali Mehta', desig:'Sales Executive', type:'Casual Leave', from:'2026-07-02', to:'2026-07-02', days:1, status:'APPROVED', paid:true },
  { id:3, emp:'Neha Gupta', desig:'Content Lead', type:'Privilege/Earned', from:'2026-07-01', to:'2026-07-08', days:6, status:'APPROVED', paid:true },
  { id:4, emp:'Rahul Sharma', desig:'Sr. Accountant', type:'Sick Leave', from:'2026-06-30', to:'2026-06-30', days:1, status:'REJECTED', paid:false },
  { id:5, emp:'Vikram Patel', desig:'Backend Dev', type:'Casual Leave', from:'2026-07-10', to:'2026-07-11', days:2, status:'PENDING', paid:true },
  { id:6, emp:'Kanchan Kumari', desig:'Recruiter', type:'Maternity Leave', from:'2026-06-15', to:'2026-07-15', days:30, status:'APPROVED', paid:true },
];

const ATT_GRID = [
  { name:'Rahul Sharma', desig:'L2', av:'RS', color:'#f59e0b', days:['P','P','P','H','P','P','O','P','P','P','H','P','P','O','P','P','P','P','H','P','P','O','P','P','P','P','H','P','P','P','O'] },
  { name:'Anjali Mehta', desig:'L1', av:'AM', color:'#ef4444', days:['P','P','P','H','L','P','O','P','P','P','H','P','P','O','A','P','P','P','H','P','P','O','P','P','A','P','H','P','P','P','O'] },
  { name:'Vikram Patel', desig:'L2', av:'VP', color:'#3b82f6', days:['P','P','P','H','P','P','O','L','P','P','H','P','P','O','P','P','P','P','H','P','P','O','P','P','P','L','H','P','P','P','O'] },
  { name:'Neha Gupta', desig:'L3', av:'NG', color:'#8b5cf6', days:['L','L','L','H','L','L','O','L','L','L','H','L','L','O','L','L','L','L','H','L','L','O','L','L','L','L','H','L','L','L','O'] },
  { name:'Aditya Maddala', desig:'L1', av:'AD', color:'#06b6d4', days:['P','P','P','H','P','P','O','P','A','P','H','P','P','O','P','P','P','P','H','P','P','O','P','P','P','P','H','A','P','P','O'] },
  { name:'Kanchan Kumari', desig:'L2', av:'KK', color:'#ec4899', days:['P','P','P','H','P','P','O','P','P','P','H','P','P','O','P','L','P','P','H','P','P','O','P','P','P','P','H','P','P','P','O'] },
];

const SHIFTS = [
  { name:'Rahul Sharma', desig:'L2', av:'RS', color:'#f59e0b', shifts:['General','General','General','General','General','Saturday','Sunday'] },
  { name:'Anjali Mehta', desig:'L1', av:'AM', color:'#ef4444', shifts:['General','General','General','General','General','Saturday','Sunday'] },
  { name:'Vikram Patel', desig:'L2', av:'VP', color:'#3b82f6', shifts:['Night','Night','Night','Night','Night','Saturday','Sunday'] },
  { name:'Neha Gupta', desig:'L3', av:'NG', color:'#8b5cf6', shifts:['Maternity','Maternity','Maternity','Maternity','Maternity','Saturday','Sunday'] },
  { name:'Aditya Maddala', desig:'L1', av:'AD', color:'#06b6d4', shifts:['General','General','General','General','General','Saturday','Sunday'] },
];

const TICKETS = [
  { id:'TKT-001', subj:'Unable to access payroll module', cat:'IT Support', pri:'High', status:'OPEN', date:'2026-07-03' },
  { id:'TKT-002', subj:'Laptop keyboard not working', cat:'Hardware', pri:'Medium', status:'IN_PROGRESS', date:'2026-07-02' },
  { id:'TKT-003', subj:'VPN connectivity issue', cat:'Network', pri:'High', status:'RESOLVED', date:'2026-07-01' },
  { id:'TKT-004', subj:'Leave policy document request', cat:'HR', pri:'Low', status:'OPEN', date:'2026-07-04' },
];

const NOTICES = [
  { title:'Q3 Performance Reviews Begin', body:'Annual performance review cycle starts 10th July 2026. All managers must complete goal setting by EOD 9th July.', date:'2026-07-04', pri:'HIGH' },
  { title:'Independence Day Holiday — 15 August 2026', body:'The office will remain closed on 15th August 2026 on account of Independence Day.', date:'2026-07-01', pri:'MEDIUM' },
  { title:'New Leave Policy Effective August 2026', body:'Revised leave policy: 18 days annual casual leave and 12 days sick leave. See HR portal for details.', date:'2026-06-28', pri:'LOW' },
];

const CAL_EVENTS = {
  1:[{n:'Muhammed Shanij',c:'#10b981'},{n:'Priya Nair',c:'#ef4444'},{n:'Raheema K.',c:'#10b981'}],
  2:[{n:'Aditya Maddala',c:'#ef4444'},{n:'Anshul M.',c:'#ef4444'},{n:'Kanchan K.',c:'#10b981'}],
  3:[{n:'Priya Nair',c:'#ef4444'},{n:'Raheema K.',c:'#10b981'}],
  4:[{n:'Raheema K.',c:'#10b981'},{n:'Shell Kaur',c:'#3b82f6'}],
  7:[{n:'Naheema',c:'#10b981'},{n:'Sooraj S.',c:'#3b82f6'}],
  8:[{n:'Naheema',c:'#10b981'}],9:[{n:'Naheema',c:'#10b981'}],
  10:[{n:'Naheema',c:'#10b981'},{n:'Vikram Patel',c:'#3b82f6'}],
  14:[{n:'Raheema K.',c:'#10b981'}],15:[{n:'Raheema K.',c:'#10b981'}],
  16:[{n:'Raheema K.',c:'#10b981'}],17:[{n:'Raheema K.',c:'#10b981'}],
  18:[{n:'Raheema K.',c:'#10b981'},{n:'Vikram Patel',c:'#3b82f6'}],
  21:[{n:'Raheema K.',c:'#10b981'}],22:[{n:'Raheema K.',c:'#10b981'}],
  25:[{n:'Anjali Mehta',c:'#ef4444'}],28:[{n:'Rahul Sharma',c:'#f59e0b'}],
};

const PROJECTS_INIT = [
  { code:'PRJ-001', name:'Odoo HRMS Implementation', client:'Authority Entrepreneurs', start:'2026-07-01', end:'2026-09-30', status:'In Progress', pct:75, members:['SD','PN','RS'] },
  { code:'PRJ-002', name:'Finance Module Upgrades', client:'Global Tech Solutions', start:'2026-06-15', end:'2026-08-15', status:'On Hold', pct:30, members:['RS','AM'] },
  { code:'PRJ-003', name:'Mobile HR App', client:'Sharma & Associates', start:'2026-07-04', end:'2026-12-31', status:'In Progress', pct:15, members:['VP','AD'] },
];

const TASKS_INIT = [
  { code:'TSK-001', desc:'Fix TDS precision in Payroll Engine', start:'2026-07-01', due:'2026-07-05', hrs:'3h 14m', assign:'SD', status:'Todo', pri:'High' },
  { code:'TSK-002', desc:'HRMS Database 3NF Compliance Audit', start:'2026-06-25', due:'2026-07-08', hrs:'2h 50m', assign:'RS', status:'Doing', pri:'High' },
  { code:'TSK-003', desc:'Employee Self-Service Portal Phase 2', start:'2026-06-20', due:'2026-07-15', hrs:'1h 20m', assign:'PN', status:'Todo', pri:'Low' },
  { code:'TSK-004', desc:'CRM Setup — Automations & Pipelines', start:'2026-06-18', due:'2026-07-02', hrs:'4h 05m', assign:'AM', status:'Done', pri:'Medium' },
  { code:'TSK-005', desc:'Attendance Biometric Integration Spike', start:'2026-07-03', due:'2026-07-10', hrs:'0h', assign:'VP', status:'Todo', pri:'High' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Modal Component ──────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'16px',padding:'28px',minWidth:'520px',maxWidth:'680px',width:'90vw',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',borderBottom:'1px solid var(--border)',paddingBottom:'14px'}}>
          <h2 style={{fontSize:'16px',fontWeight:800,color:'var(--text)'}}>{title}</h2>
          <button onClick={onClose} style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'8px',width:'32px',height:'32px',cursor:'pointer',fontSize:'16px',color:'var(--muted)'}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Form Row Helper ──────────────────────────────────────────────────────────
function FRow({ label, children }) {
  return (
    <div style={{marginBottom:'14px'}}>
      <label style={{display:'block',fontSize:'11px',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'5px'}}>{label}</label>
      {children}
    </div>
  );
}

function FInput({ value, onChange, type='text', placeholder='', required }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'13px',color:'var(--text)',background:'var(--bg)',outline:'none',fontFamily:'Inter,sans-serif'}} />;
}

function FSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'13px',color:'var(--text)',background:'var(--bg)',outline:'none',fontFamily:'Inter,sans-serif'}}>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token')||null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')||'null'));
  const [portal, setPortal] = useState('admin');
  const [email, setEmail] = useState('soumoditya@hrms.in');
  const [password, setPassword] = useState('admin@2026');
  const [tab, setTab] = useState('dashboard');
  const [hrOpen, setHrOpen] = useState(true);
  const [workOpen, setWorkOpen] = useState(true);
  const [dark, setDark] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [calMonth, setCalMonth] = useState(6);
  const [calYear] = useState(2026);
  const [calSelectedDates, setCalSelectedDates] = useState([]);
  const [clockedIn, setClockedIn] = useState(false);
  const [secs, setSecs] = useState(0);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const timerRef = useRef(null);
  const canvasRef = useRef(null);

  // Modals
  const [modal, setModal] = useState(null); // 'attendance'|'project'|'leave'|'task'|'employee'|'profile'
  const [profileEmp, setProfileEmp] = useState(EMPS[0]);

  // Form states
  const [attForm, setAttForm] = useState({ emp:'Soumoditya Das', type:'Present', date: new Date().toISOString().split('T')[0], checkIn:'09:00', checkOut:'18:00', notes:'' });
  const [projForm, setProjForm] = useState({ name:'', client:'', start:'2026-07-04', end:'2026-08-31', status:'In Progress', desc:'' });
  const [leaveForm, setLeaveForm] = useState({ emp:'', type:'Paid Time Off', from:'', to:'', remarks:'' });
  const [taskForm, setTaskForm] = useState({ title:'', project:'Odoo HRMS Implementation', assign:'SD', due:'2026-07-10', pri:'Medium', desc:'' });
  const [empForm, setEmpForm] = useState({ first:'', last:'', email:'', dept:'Engineering', desig:'', wage:50000, role:'EMPLOYEE' });

  // Live data
  const [projects, setProjects] = useState(PROJECTS_INIT);
  const [tasks, setTasks] = useState(TASKS_INIT);
  const [leaves, setLeaves] = useState(LEAVES);
  const [selectedPayEmp, setSelectedPayEmp] = useState(EMPS[0]);
  const [notifications, setNotifications] = useState([
    { id:1, msg:'Priya Nair submitted a leave request', time:'2 min ago', read:false },
    { id:2, msg:'Q3 performance review cycle begins tomorrow', time:'1 hr ago', read:false },
    { id:3, msg:'Attendance report for June is ready', time:'3 hrs ago', read:true },
  ]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(()=>{ const t=setInterval(()=>setTime(new Date().toLocaleTimeString()),1000); return ()=>clearInterval(t); },[]);

  useEffect(()=>{
    if (token||!canvasRef.current) return;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
    const renderer=new THREE.WebGLRenderer({canvas:canvasRef.current,alpha:true});
    renderer.setSize(window.innerWidth,window.innerHeight);
    const particles=[]; const geo=new THREE.SphereGeometry(0.1,8,8);
    for(let i=0;i<150;i++){
      const mat=new THREE.MeshBasicMaterial({color:i%3===0?0x6366f1:i%3===1?0x3b82f6:0x10b981});
      const m=new THREE.Mesh(geo,mat);
      m.position.set((Math.random()-0.5)*70,(Math.random()-0.5)*45,(Math.random()-0.5)*30);
      m.userData={vy:(Math.random()-0.5)*0.025,vx:(Math.random()-0.5)*0.018};
      scene.add(m); particles.push(m);
    }
    const tg=new THREE.TorusGeometry(14,0.35,8,90);
    const tm=new THREE.MeshBasicMaterial({color:0x4f86f7,wireframe:true,opacity:0.25,transparent:true});
    const torus=new THREE.Mesh(tg,tm); scene.add(torus);
    camera.position.z=30; let raf;
    const animate=()=>{ raf=requestAnimationFrame(animate); torus.rotation.x+=0.003; torus.rotation.y+=0.0015; particles.forEach(p=>{p.position.y+=p.userData.vy;p.position.x+=p.userData.vx;if(Math.abs(p.position.y)>24)p.userData.vy*=-1;if(Math.abs(p.position.x)>36)p.userData.vx*=-1;}); renderer.render(scene,camera); };
    animate();
    const onR=()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);};
    window.addEventListener('resize',onR);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',onR);renderer.dispose();};
  },[token]);

  const handleLogin=(e)=>{
    e.preventDefault();
    fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,portal})})
      .then(r=>{if(!r.ok)throw new Error('Invalid credentials');return r.json();})
      .then(d=>{localStorage.setItem('token',d.token);localStorage.setItem('user',JSON.stringify(d.user));setToken(d.token);setUser(d.user);})
      .catch(err=>alert(err.message));
  };
  const handleLogout=()=>{localStorage.clear();setToken(null);setUser(null);};
  const toggleClock=()=>{ setClockedIn(c=>{if(!c){timerRef.current=setInterval(()=>setSecs(s=>s+1),1000);}else{clearInterval(timerRef.current);setSecs(0);}return !c;}); };
  const fmt=s=>`${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  // Calendar
  const mFirstDay = new Date(calYear, calMonth, 1).getDay();
  const mDays = new Date(calYear, calMonth+1, 0).getDate();
  const offset = mFirstDay===0?6:mFirstDay-1;
  const calCells = Array.from({length:42},(_,i)=>{ const d=i-offset+1; return (d<1||d>mDays)?null:d; });
  const toggleCalDate=(d)=>{
    if(!d) return;
    const key=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    setCalSelectedDates(prev=>prev.includes(key)?prev.filter(x=>x!==key):[...prev,key]);
  };

  const filteredEmps = EMPS.filter(e=>`${e.first} ${e.last} ${e.email} ${e.dept} ${e.desig}`.toLowerCase().includes(empSearch.toLowerCase()));
  const unreadNotif = notifications.filter(n=>!n.read).length;
  const salaryData = compileSalary(selectedPayEmp.wage, selectedPayEmp.days);
  const nav=t=>{ setTab(t); setModal(null); };

  if (!token) return (
    <div className="login-overlay">
      <canvas ref={canvasRef} className="login-canvas"/>
      <div className="login-card">
        <div className="login-logo">O</div>
        <div className="login-title">Odoo HRMS Portal</div>
        <div className="login-sub">Enterprise Human Resource Management System · Every workday, perfectly aligned.</div>
        <div className="portal-grid">
          <button className={`portal-btn ${portal==='admin'?'active':''}`} onClick={()=>{setPortal('admin');setEmail('soumoditya@hrms.in');setPassword('admin@2026');}}><span className="portal-icon">🔑</span>HR / Admin</button>
          <button className={`portal-btn ${portal==='employee'?'active':''}`} onClick={()=>{setPortal('employee');setEmail('priya.nair@hrms.in');setPassword('password123');}}><span className="portal-icon">👤</span>Employee</button>
        </div>
        <form onSubmit={handleLogin}>
          <input type="text" className="login-field" placeholder="Email Address" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <input type="password" className="login-field" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
          <button type="submit" className="login-btn">🔐 Secure Login</button>
        </form>
        <div style={{textAlign:'center',marginTop:'16px',color:'rgba(255,255,255,0.3)',fontSize:'11px',lineHeight:1.6}}>
          Admin: soumoditya@hrms.in · admin@2026<br/>Employee: priya.nair@hrms.in · password123
        </div>
      </div>
    </div>
  );

  const isAdmin = user?.portal_role==='ADMIN' || user?.portal_role==='admin';
  const userMask = isAdmin ? 63 : 3;

  return (
    <div className={`app ${dark?'dark':''}`}>

      {/* ── MODALS ── */}
      {modal==='attendance' && (
        <Modal title="✔ Mark Attendance" onClose={()=>setModal(null)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <FRow label="Employee"><FSelect value={attForm.emp} onChange={e=>setAttForm({...attForm,emp:e.target.value})} options={EMPS.map(e=>`${e.first} ${e.last}`)}/></FRow>
            <FRow label="Status"><FSelect value={attForm.type} onChange={e=>setAttForm({...attForm,type:e.target.value})} options={['Present','Absent','Half Day','Work From Home','On Leave']}/></FRow>
            <FRow label="Date"><FInput type="date" value={attForm.date} onChange={e=>setAttForm({...attForm,date:e.target.value})}/></FRow>
            <FRow label="Check-In Time"><FInput type="time" value={attForm.checkIn} onChange={e=>setAttForm({...attForm,checkIn:e.target.value})}/></FRow>
            <FRow label="Check-Out Time"><FInput type="time" value={attForm.checkOut} onChange={e=>setAttForm({...attForm,checkOut:e.target.value})}/></FRow>
            <FRow label="Break Hours"><FInput type="number" value="1" placeholder="e.g. 1"/></FRow>
          </div>
          <FRow label="Remarks / Notes"><textarea value={attForm.notes} onChange={e=>setAttForm({...attForm,notes:e.target.value})} placeholder="Optional notes..." style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'13px',color:'var(--text)',background:'var(--bg)',resize:'vertical',minHeight:'64px',fontFamily:'Inter,sans-serif'}}/></FRow>
          <div style={{display:'flex',gap:'10px',marginTop:'8px'}}>
            <button className="btn btn-primary" onClick={()=>{ alert(`✅ Attendance marked for ${attForm.emp} — ${attForm.type}`); setModal(null); }}>✔ Save Attendance</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {modal==='project' && (
        <Modal title="📁 New Project" onClose={()=>setModal(null)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div style={{gridColumn:'1/-1'}}><FRow label="Project Name *"><FInput value={projForm.name} onChange={e=>setProjForm({...projForm,name:e.target.value})} placeholder="e.g. HRMS Phase 2 Implementation" required/></FRow></div>
            <FRow label="Client Name"><FInput value={projForm.client} onChange={e=>setProjForm({...projForm,client:e.target.value})} placeholder="e.g. Authority Entrepreneurs"/></FRow>
            <FRow label="Status"><FSelect value={projForm.status} onChange={e=>setProjForm({...projForm,status:e.target.value})} options={['In Progress','On Hold','Completed','Not Started']}/></FRow>
            <FRow label="Start Date"><FInput type="date" value={projForm.start} onChange={e=>setProjForm({...projForm,start:e.target.value})}/></FRow>
            <FRow label="End Date / Deadline"><FInput type="date" value={projForm.end} onChange={e=>setProjForm({...projForm,end:e.target.value})}/></FRow>
            <div style={{gridColumn:'1/-1'}}><FRow label="Description"><textarea value={projForm.desc} onChange={e=>setProjForm({...projForm,desc:e.target.value})} placeholder="Brief project description..." style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'13px',color:'var(--text)',background:'var(--bg)',resize:'vertical',minHeight:'72px',fontFamily:'Inter,sans-serif'}}/></FRow></div>
          </div>
          <div style={{display:'flex',gap:'10px',marginTop:'8px'}}>
            <button className="btn btn-primary" onClick={()=>{
              if(!projForm.name){ alert('Project name required'); return; }
              const newP={code:`PRJ-00${projects.length+1}`,name:projForm.name,client:projForm.client||'Internal',start:projForm.start,end:projForm.end,status:projForm.status,pct:0,members:['SD']};
              setProjects(p=>[...p,newP]); setProjForm({name:'',client:'',start:'2026-07-04',end:'2026-08-31',status:'In Progress',desc:''}); setModal(null); nav('projects');
            }}>+ Create Project</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {modal==='leave' && (
        <Modal title="🏖 Apply for Leave" onClose={()=>setModal(null)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <FRow label="Employee"><FSelect value={leaveForm.emp||'Soumoditya Das'} onChange={e=>setLeaveForm({...leaveForm,emp:e.target.value})} options={EMPS.map(e=>`${e.first} ${e.last}`)}/></FRow>
            <FRow label="Leave Type"><FSelect value={leaveForm.type} onChange={e=>setLeaveForm({...leaveForm,type:e.target.value})} options={['Paid Time Off','Sick Leave','Unpaid Leave','Casual Leave','Privilege/Earned','Maternity Leave','Paternity Leave','Compensatory Off']}/></FRow>
            <FRow label="From Date *"><FInput type="date" value={leaveForm.from} onChange={e=>setLeaveForm({...leaveForm,from:e.target.value})} required/></FRow>
            <FRow label="To Date *"><FInput type="date" value={leaveForm.to} onChange={e=>setLeaveForm({...leaveForm,to:e.target.value})} required/></FRow>
          </div>
          {leaveForm.type==='Sick Leave' && <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:'8px',padding:'10px 12px',fontSize:'12px',color:'#92400e',marginBottom:'12px'}}>⚠️ Medical certificate required for sick leave exceeding 2 days.</div>}
          <FRow label="Reason / Remarks"><textarea value={leaveForm.remarks} onChange={e=>setLeaveForm({...leaveForm,remarks:e.target.value})} placeholder="Reason for leave request..." style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'13px',color:'var(--text)',background:'var(--bg)',resize:'vertical',minHeight:'72px',fontFamily:'Inter,sans-serif'}}/></FRow>
          <div style={{background:'var(--bg)',borderRadius:'10px',padding:'10px 14px',fontSize:'12px',color:'var(--muted)',marginBottom:'12px'}}>
            📊 Leave Balance — Paid: <strong>14 days</strong> &nbsp;|&nbsp; Sick: <strong>7 days</strong> &nbsp;|&nbsp; Casual: <strong>5 days</strong>
          </div>
          <div style={{display:'flex',gap:'10px'}}>
            <button className="btn btn-primary" onClick={()=>{
              if(!leaveForm.from||!leaveForm.to){alert('Please select dates');return;}
              const emp=leaveForm.emp||'Soumoditya Das';
              const days=Math.max(1,Math.round((new Date(leaveForm.to)-new Date(leaveForm.from))/(86400000))+1);
              setLeaves(l=>[{id:l.length+1,emp,desig:'--',type:leaveForm.type,from:leaveForm.from,to:leaveForm.to,days,status:'PENDING',paid:leaveForm.type!=='Unpaid Leave'},...l]);
              setLeaveForm({emp:'',type:'Paid Time Off',from:'',to:'',remarks:''}); setModal(null); nav('leaves');
            }}>Submit Request</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {modal==='task' && (
        <Modal title="✅ Add New Task" onClose={()=>setModal(null)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div style={{gridColumn:'1/-1'}}><FRow label="Task Title *"><FInput value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} placeholder="Describe the task clearly..." required/></FRow></div>
            <FRow label="Project"><FSelect value={taskForm.project} onChange={e=>setTaskForm({...taskForm,project:e.target.value})} options={projects.map(p=>p.name)}/></FRow>
            <FRow label="Assigned To"><FSelect value={taskForm.assign} onChange={e=>setTaskForm({...taskForm,assign:e.target.value})} options={EMPS.map(e=>e.av)}/></FRow>
            <FRow label="Due Date"><FInput type="date" value={taskForm.due} onChange={e=>setTaskForm({...taskForm,due:e.target.value})}/></FRow>
            <FRow label="Priority"><FSelect value={taskForm.pri} onChange={e=>setTaskForm({...taskForm,pri:e.target.value})} options={['High','Medium','Low']}/></FRow>
            <div style={{gridColumn:'1/-1'}}><FRow label="Description"><textarea value={taskForm.desc} onChange={e=>setTaskForm({...taskForm,desc:e.target.value})} placeholder="Additional context..." style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'13px',color:'var(--text)',background:'var(--bg)',resize:'vertical',minHeight:'64px',fontFamily:'Inter,sans-serif'}}/></FRow></div>
          </div>
          <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
            <button className="btn btn-primary" onClick={()=>{
              if(!taskForm.title){alert('Task title required');return;}
              const newT={code:`TSK-00${tasks.length+1}`,desc:taskForm.title,start:new Date().toISOString().split('T')[0],due:taskForm.due,hrs:'0h',assign:taskForm.assign,status:'Todo',pri:taskForm.pri};
              setTasks(t=>[...t,newT]); setTaskForm({title:'',project:'Odoo HRMS Implementation',assign:'SD',due:'2026-07-10',pri:'Medium',desc:''}); setModal(null); nav('tasks');
            }}>+ Add Task</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {modal==='employee' && (
        <Modal title="👤 Add New Employee" onClose={()=>setModal(null)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <FRow label="First Name *"><FInput value={empForm.first} onChange={e=>setEmpForm({...empForm,first:e.target.value})} placeholder="e.g. Rohit" required/></FRow>
            <FRow label="Last Name *"><FInput value={empForm.last} onChange={e=>setEmpForm({...empForm,last:e.target.value})} placeholder="e.g. Das" required/></FRow>
            <FRow label="Email *"><FInput type="email" value={empForm.email} onChange={e=>setEmpForm({...empForm,email:e.target.value})} placeholder="rohit.das@hrms.in" required/></FRow>
            <FRow label="Mobile"><FInput value="" placeholder="+91 XXXXX XXXXX"/></FRow>
            <FRow label="Department"><FSelect value={empForm.dept} onChange={e=>setEmpForm({...empForm,dept:e.target.value})} options={['Engineering','HR','Finance','Sales','Marketing','Operations','Design']}/></FRow>
            <FRow label="Designation"><FInput value={empForm.desig} onChange={e=>setEmpForm({...empForm,desig:e.target.value})} placeholder="e.g. Software Engineer"/></FRow>
            <FRow label="Monthly Wage (₹)"><FInput type="number" value={empForm.wage} onChange={e=>setEmpForm({...empForm,wage:Number(e.target.value)})} placeholder="50000"/></FRow>
            <FRow label="Role"><FSelect value={empForm.role} onChange={e=>setEmpForm({...empForm,role:e.target.value})} options={['EMPLOYEE','ADMIN']}/></FRow>
          </div>
          {empForm.first && empForm.last && <div style={{background:'var(--bg)',borderRadius:'8px',padding:'10px 14px',fontSize:'12px',color:'var(--muted)',marginBottom:'12px'}}>
            Auto-Generated Emp Code: <strong>OI-{empForm.first.slice(0,5).toUpperCase()}-{new Date().getFullYear()}-{String(EMPS.length+1).padStart(4,'0')}</strong>
          </div>}
          <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
            <button className="btn btn-primary" onClick={()=>{ if(!empForm.first||!empForm.last||!empForm.email){alert('Required fields missing');return;} alert(`✅ Employee ${empForm.first} ${empForm.last} added successfully!\nEmp Code: OI-${empForm.first.slice(0,5).toUpperCase()}-${new Date().getFullYear()}-${String(EMPS.length+1).padStart(4,'0')}`); setModal(null); }}>Save Employee</button>
            <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {modal==='profile' && (
        <Modal title={`👤 ${profileEmp.first} ${profileEmp.last} — Profile`} onClose={()=>setModal(null)}>
          {(()=>{ const sal=compileSalary(profileEmp.wage,profileEmp.days); return (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'16px',padding:'16px',background:'var(--bg)',borderRadius:'12px',marginBottom:'16px'}}>
                <div style={{width:60,height:60,borderRadius:'14px',background:`linear-gradient(135deg,${profileEmp.color},#6366f1)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:900,color:'#fff'}}>{profileEmp.av}</div>
                <div>
                  <div style={{fontSize:'16px',fontWeight:800}}>{profileEmp.first} {profileEmp.last}</div>
                  <div style={{fontSize:'12px',color:'var(--accent)',fontWeight:600}}>{profileEmp.desig} · {profileEmp.dept}</div>
                  <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'2px'}}>{profileEmp.code}</div>
                </div>
                <div style={{marginLeft:'auto'}}><span className={`badge ${profileEmp.status==='PRESENT'?'green':profileEmp.status==='ON_LEAVE'?'orange':'red'}`}>● {profileEmp.status}</span></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
                <div style={{background:'var(--bg)',borderRadius:'12px',padding:'14px'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--accent)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Private Information</div>
                  {[['Date of Birth',profileEmp.dob],['Date of Joining',profileEmp.joined],['Mobile',profileEmp.mobile],['Email',profileEmp.email],['PAN No.',profileEmp.pan],['Role Bitmask',`${userMask} (${isAdmin?'Admin 63':'Employee 3'})`]].map(([k,v])=>(
                    <div key={k} style={{marginBottom:'8px'}}><div style={{fontSize:'10px',color:'var(--muted)',fontWeight:700}}>{k}</div><div style={{fontSize:'12.5px',fontWeight:500}}>{v}</div></div>
                  ))}
                </div>
                <div style={{background:'var(--bg)',borderRadius:'12px',padding:'14px'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--accent)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Bank Details</div>
                  {[['Bank Name',profileEmp.bank],['Account No.',profileEmp.acc],['IFSC Code',profileEmp.ifsc],['Account Type','Savings'],['Monthly Wage',`₹ ${profileEmp.wage.toLocaleString('en-IN')}`],['Payable Days',`${profileEmp.days} / 22 days`]].map(([k,v])=>(
                    <div key={k} style={{marginBottom:'8px'}}><div style={{fontSize:'10px',color:'var(--muted)',fontWeight:700}}>{k}</div><div style={{fontSize:'12.5px',fontWeight:500,fontFamily:k.includes('No')||k.includes('IFSC')?'monospace':'inherit'}}>{v}</div></div>
                  ))}
                </div>
              </div>
              {can(userMask,PERM.PAYROLL_READ) && <div style={{background:'var(--bg)',borderRadius:'12px',padding:'14px'}}>
                <div style={{fontSize:'11px',fontWeight:700,color:'var(--accent)',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Salary Structure (Auto-Computed)</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'12px'}}>
                  {[['Basic (50% of Wage)',sal.basic],['HRA (50% of Basic)',sal.hra],['Standard Allowance',sal.std],['Performance Bonus (8.33%)',sal.perf],['Leave Travel Allowance',sal.lta],['Fixed Allowance (Residual)',sal.fixed]].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:'var(--card)',borderRadius:'6px',border:'1px solid var(--border)'}}>
                      <span style={{color:'var(--muted)'}}>{k}</span><span style={{fontWeight:700}}>₹ {v.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',fontSize:'12px',marginTop:'8px'}}>
                  {[['Gross',sal.gross,'#16a34a'],['PF Deduction',sal.pf,'#dc2626'],['TDS',sal.tds,'#dc2626'],['Prof. Tax',sal.pt,'#dc2626'],['Total Deductions',sal.pf+sal.pt+sal.tds,'#dc2626'],['Net Take-Home',sal.net,'#16a34a']].map(([k,v,c])=>(
                    <div key={k} style={{padding:'8px 10px',background:'var(--card)',borderRadius:'8px',border:`2px solid ${c}22`,textAlign:'center'}}>
                      <div style={{fontSize:'10px',color:'var(--muted)',fontWeight:700,marginBottom:'4px'}}>{k}</div>
                      <div style={{fontSize:'14px',fontWeight:800,color:c}}>₹ {v.toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>}
            </div>
          );})()}
        </Modal>
      )}

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-icon">O</div>
          <div className="sb-company">Odoo Suite <span>Soumoditya Das</span></div>
        </div>
        <div className="sb-user">
          <div className="sb-avatar" style={{background:'linear-gradient(135deg,#6366f1,#3b82f6)'}}>{user?.name?.[0]||'S'}{user?.name?.split(' ')?.[1]?.[0]||'D'}</div>
          <div><div className="sb-uname">{user?.name||'Soumoditya Das'}</div><div className="sb-urole">{user?.portal_role||'ADMIN'} · Mask:{userMask}</div></div>
          <div className="online"></div>
        </div>
        <div style={{padding:'8px 0'}}>
          <div className={`sb-item ${tab==='dashboard'?'active':''}`} onClick={()=>nav('dashboard')}><span className="sb-icon">📊</span>Dashboard</div>
          <div className={`sb-item ${tab==='calendar'?'active':''}`} onClick={()=>nav('calendar')}><span className="sb-icon">📅</span>My Calendar</div>
          <div className={`sb-item ${tab==='profile'?'active':''}`} onClick={()=>nav('profile')}><span className="sb-icon">🙍</span>My Profile</div>
          <div className={`sb-item ${tab==='clients'?'active':''}`} onClick={()=>nav('clients')}><span className="sb-icon">💼</span>Clients</div>
          <div className="sb-section" onClick={()=>setHrOpen(!hrOpen)} style={{cursor:'pointer'}}>HR <span className={`sb-arrow ${hrOpen?'open':''}`}>›</span></div>
          {hrOpen && <div className="sub-nav">
            {can(userMask,PERM.ADMIN_VIEW_ALL) && <div className={`sb-item ${tab==='employees'?'active':''}`} onClick={()=>nav('employees')}>Employees</div>}
            <div className={`sb-item ${tab==='leaves'?'active':''}`} onClick={()=>nav('leaves')}>Leaves</div>
            <div className={`sb-item ${tab==='shift'?'active':''}`} onClick={()=>nav('shift')}>Shift Roster</div>
            <div className={`sb-item ${tab==='attendance'?'active':''}`} onClick={()=>nav('attendance')}>Attendance</div>
            <div className={`sb-item ${tab==='payroll'?'active':''}`} onClick={()=>nav('payroll')}>Payroll & Salary</div>
            <div className={`sb-item ${tab==='holiday'?'active':''}`} onClick={()=>nav('holiday')}>Holiday</div>
          </div>}
          <div className="sb-section" onClick={()=>setWorkOpen(!workOpen)} style={{cursor:'pointer'}}>Work <span className={`sb-arrow ${workOpen?'open':''}`}>›</span></div>
          {workOpen && <div className="sub-nav">
            <div className={`sb-item ${tab==='projects'?'active':''}`} onClick={()=>nav('projects')}>Projects</div>
            <div className={`sb-item ${tab==='tasks'?'active':''}`} onClick={()=>nav('tasks')}>Tasks</div>
            <div className="sb-item">Timesheet</div>
          </div>}
          <div className={`sb-item ${tab==='tickets'?'active':''}`} onClick={()=>nav('tickets')}><span className="sb-icon">🎟</span>Tickets</div>
          <div className={`sb-item ${tab==='notices'?'active':''}`} onClick={()=>nav('notices')}><span className="sb-icon">📢</span>Notice Board</div>
          <div className="sb-item"><span className="sb-icon">⚙️</span>Settings</div>
        </div>
        <div className="sb-version">HRMS v2.0 · Odoo Hackathon 2026</div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        <header className="topbar">
          <div className="tb-breadcrumb">
            <span style={{color:'var(--muted)',fontSize:'12px'}}>Home</span>
            <span style={{color:'var(--muted)',margin:'0 5px'}}>›</span>
            <span className="tb-title">{tab.charAt(0).toUpperCase()+tab.slice(1)}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'7px',marginLeft:'auto',position:'relative'}}>
            <button className="icon-btn" title="Search employees">🔍</button>
            <button className="icon-btn" title="Notifications" style={{position:'relative'}} onClick={()=>setShowNotif(!showNotif)}>
              🔔
              {unreadNotif>0 && <span style={{position:'absolute',top:2,right:2,width:8,height:8,background:'#ef4444',borderRadius:'50%',border:'1.5px solid var(--card)'}}></span>}
            </button>
            {showNotif && (
              <div style={{position:'absolute',top:'40px',right:0,background:'var(--card)',border:'1px solid var(--border)',borderRadius:'12px',width:'300px',boxShadow:'var(--shadow-lg)',zIndex:100}}>
                <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'13px'}}>Notifications</div>
                {notifications.map((n,i)=>(
                  <div key={i} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:n.read?'transparent':'rgba(79,134,247,0.05)',cursor:'pointer'}} onClick={()=>setNotifications(ns=>ns.map((x,j)=>j===i?{...x,read:true}:x))}>
                    <div style={{fontSize:'12.5px',fontWeight:n.read?400:600}}>{n.msg}</div>
                    <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'2px'}}>{n.time}</div>
                  </div>
                ))}
              </div>
            )}
            <button className="icon-btn" onClick={()=>setDark(!dark)} title="Toggle dark mode">{dark?'☀️':'🌙'}</button>
          </div>
          <div className="tb-clock"><div className="tb-time">{time}</div><div className="tb-day">Odoo Enterprise HRMS</div></div>
          <button className={`clock-btn ${clockedIn?'out':''}`} onClick={toggleClock}>{clockedIn?`⏰ ${fmt(secs)}`:' ⏱ Clock In'}</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </header>

        <div className="content">

          {/* ══ DASHBOARD ══ */}
          {tab==='dashboard' && <>
            <div className="banner">🚀 Welcome back, <strong>{user?.name||'Soumoditya Das'}</strong>! Enterprise HRMS — Bitwise RBAC active. Access mask: <code style={{background:'rgba(0,0,0,0.1)',padding:'1px 6px',borderRadius:'4px',fontFamily:'monospace'}}>{userMask}</code><span style={{marginLeft:'auto',color:'#0369a1',fontWeight:700,fontSize:'12px'}}>4 Jul 2026 — Hackathon Extended Build</span></div>
            <div className="g4">
              {[{l:'Total Workforce',v:EMPS.length,s:'Registered Employees',c:'blue',i:'👥'},{l:'Present Today',v:5,s:'In Office / WFH',c:'green',i:'✅'},{l:'On Leave Today',v:2,s:'Approved Absences',c:'orange',i:'✈️'},{l:'Open Tickets',v:2,s:'Awaiting Resolution',c:'red',i:'🎫'}].map((k,i)=>(
                <div className="card kpi" key={i}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div><div className="kpi-lbl">{k.l}</div><div className={`kpi-val ${k.c}`}>{k.v}</div><div className="kpi-sub">{k.s}</div></div>
                    <span style={{fontSize:'26px',opacity:0.2}}>{k.i}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="g2">
              <div className="card">
                <div className="card-hdr">Employee Profile &amp; Clock</div>
                <div className="card-body">
                  <div className="profile-card">
                    <div className="profile-av">SD</div>
                    <div>
                      <div className="profile-name">{user?.name||'Soumoditya Das'}</div>
                      <div className="profile-role">ADMIN · Engineering · L1 Engineer</div>
                      <div className="profile-id">{user?.email||'soumoditya@hrms.in'}</div>
                      <div style={{marginTop:'10px',display:'flex',gap:'18px'}}>
                        {[{v:22,l:'Days Present'},{v:0,l:'Leaves Used'},{v:5,l:'Open Tasks'}].map((s,i)=>(
                          <div key={i} style={{textAlign:'center'}}><div style={{fontSize:'20px',fontWeight:900,color:'var(--accent)'}}>{s.v}</div><div style={{fontSize:'10px',color:'var(--muted)'}}>{s.l}</div></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{marginTop:'14px',padding:'12px',background:'var(--bg)',borderRadius:'10px',display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{flex:1}}><div style={{fontSize:'10px',color:'var(--muted)',marginBottom:'3px'}}>Today's Session</div><div style={{fontSize:'28px',fontWeight:900,fontVariantNumeric:'tabular-nums'}}>{fmt(secs)}</div></div>
                    <button className={`att-btn ${clockedIn?'att-btn-out':'att-btn-in'}`} onClick={toggleClock}>{clockedIn?'Clock Out':'Clock In'}</button>
                  </div>
                  <button className="btn btn-outline" style={{width:'100%',marginTop:'10px',justifyContent:'center'}} onClick={()=>{setProfileEmp(EMPS[0]);setModal('profile');}}>👤 View Full Profile</button>
                </div>
              </div>
              <div className="card">
                <div className="card-hdr">Notice Board <span className="badge blue">{NOTICES.length}</span></div>
                <div className="card-body">
                  {NOTICES.map((n,i)=>(
                    <div className="notice-item" key={i}>
                      <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'5px'}}>
                        <span className={`badge ${n.pri==='HIGH'?'red':n.pri==='MEDIUM'?'orange':'gray'}`}>{n.pri}</span>
                        <div className="notice-title">{n.title}</div>
                      </div>
                      <div className="notice-meta">📅 {n.date}</div>
                      <div className="notice-body">{n.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="g2">
              <div className="card">
                <div className="card-hdr">On Leave Today <span className="badge orange">2</span></div>
                <div className="card-body">
                  {EMPS.filter(e=>e.status==='ON_LEAVE').map((e,i)=>(
                    <div className="shift-row" key={i}>
                      <div className="av" style={{background:e.color}}>{e.av}</div>
                      <div><div style={{fontWeight:600,fontSize:'13px'}}>{e.first} {e.last}</div><div style={{fontSize:'11px',color:'var(--muted)'}}>{e.desig} · Maternity Leave</div></div>
                      <span className="badge green" style={{marginLeft:'auto'}}>Approved</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-hdr">Joinings &amp; Anniversaries 🎉</div>
                <div className="card-body">
                  {[{n:'Rahul Sharma',t:'3rd Work Anniversary 🎊',av:'RS',c:'#f59e0b'},{n:'Anjali Mehta',t:'Birthday Today 🎂',av:'AM',c:'#ef4444'},{n:'Vikram Patel',t:'New Joinee This Month 🌟',av:'VP',c:'#3b82f6'}].map((j,i)=>(
                    <div className="shift-row" key={i}>
                      <div className="av" style={{background:j.c}}>{j.av}</div>
                      <div><div style={{fontWeight:600,fontSize:'13px'}}>{j.n}</div><div style={{fontSize:'11px',color:'var(--muted)'}}>{j.t}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>}

          {/* ══ CALENDAR ══ */}
          {tab==='calendar' && <div className="card">
            <div className="card-hdr" style={{flexWrap:'wrap',gap:'8px'}}>
              <button className="btn btn-outline btn-sm" onClick={()=>setCalMonth(m=>m===0?11:m-1)}>‹ Prev</button>
              <button className="btn btn-outline btn-sm" onClick={()=>setCalMonth(6)}>Today</button>
              <button className="btn btn-outline btn-sm" onClick={()=>setCalMonth(m=>m===11?0:m+1)}>Next ›</button>
              <span style={{fontWeight:800,fontSize:'15px'}}>{MONTHS[calMonth]} {calYear}</span>
              {calSelectedDates.length>0 && <span className="badge blue">{calSelectedDates.length} date(s) selected</span>}
              <div style={{marginLeft:'auto',display:'flex',gap:'6px'}}>
                <button className="btn btn-primary btn-sm">month</button>
                <button className="btn btn-outline btn-sm">week</button>
                <button className="btn btn-outline btn-sm">day</button>
                <button className="btn btn-outline btn-sm">list</button>
              </div>
            </div>
            <div style={{padding:'8px 14px',background:'var(--bg)',borderBottom:'1px solid var(--border)',display:'flex',gap:'14px',fontSize:'11.5px',flexWrap:'wrap'}}>
              {[{c:'#10b981',l:'On Leave / Approved'},{c:'#ef4444',l:'Absent'},{c:'#4f86f7',l:'Selected Range'},{c:'#f59e0b',l:'Holiday'}].map((leg,i)=>(
                <span key={i} style={{display:'flex',alignItems:'center',gap:'5px',color:'var(--muted)'}}><span style={{width:10,height:10,borderRadius:'50%',background:leg.c,display:'inline-block'}}></span>{leg.l}</span>
              ))}
              {calSelectedDates.length>0 && <button className="btn btn-outline btn-xs" onClick={()=>setCalSelectedDates([])}>✕ Clear Selection</button>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderTop:'1px solid var(--border)'}}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>(
                <div key={d} style={{padding:'9px',textAlign:'center',fontSize:'10.5px',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>{d}</div>
              ))}
              {calCells.map((day,i)=>{
                const key=day?`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';
                const isSelected=calSelectedDates.includes(key);
                const isToday=day===new Date().getDate()&&calMonth===new Date().getMonth()&&calYear===new Date().getFullYear();
                const evts=day?CAL_EVENTS[day]||[]:[];
                return (
                  <div key={i} onClick={()=>toggleCalDate(day)} style={{minHeight:'100px',padding:'6px',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)',cursor:day?'pointer':'default',background:isSelected?'rgba(79,134,247,0.08)':!day?'rgba(0,0,0,0.02)':isToday?'rgba(79,134,247,0.04)':'var(--card)',transition:'background 0.12s'}}>
                    {day && <>
                      <div style={{fontSize:'12px',fontWeight:700,width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',marginBottom:'4px',background:isToday?'var(--accent)':'transparent',color:isToday?'#fff':isSelected?'var(--accent)':'var(--text)',boxShadow:isToday?'0 2px 8px rgba(79,134,247,0.5)':'none'}}>{day}</div>
                      {evts.slice(0,3).map((ev,j)=>(
                        <div key={j} style={{fontSize:'10.5px',fontWeight:600,padding:'2px 6px',borderRadius:'4px',marginBottom:'2px',background:ev.c,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>✈ {ev.n}</div>
                      ))}
                      {evts.length>3 && <div style={{fontSize:'10px',color:'var(--muted)',padding:'1px 4px'}}>+{evts.length-3} more</div>}
                    </>}
                  </div>
                );
              })}
            </div>
            {calSelectedDates.length>0 && (
              <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',background:'var(--bg)',display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'12px',color:'var(--muted)'}}>Selected: <strong>{calSelectedDates.join(', ')}</strong></span>
                <button className="btn btn-primary btn-sm" onClick={()=>{ setLeaveForm({...leaveForm,from:calSelectedDates[0],to:calSelectedDates[calSelectedDates.length-1]}); setModal('leave'); }}>Apply Leave for Selected Dates</button>
              </div>
            )}
          </div>}

          {/* ══ PROFILE ══ */}
          {tab==='profile' && (()=>{
            const e=EMPS[0]; const sal=compileSalary(e.wage,e.days);
            return <>
              <div className="card mb-16">
                <div style={{padding:'24px',background:'linear-gradient(135deg,#0f172a,#1e1b4b)',borderRadius:'10px 10px 0 0',display:'flex',alignItems:'center',gap:'20px'}}>
                  <div style={{width:72,height:72,borderRadius:'16px',background:`linear-gradient(135deg,${e.color},#6366f1)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',fontWeight:900,color:'#fff',boxShadow:'0 8px 20px rgba(0,0,0,0.4)'}}>{e.av}</div>
                  <div>
                    <div style={{fontSize:'20px',fontWeight:900,color:'#fff'}}>{e.first} {e.last}</div>
                    <div style={{color:'rgba(255,255,255,0.6)',fontSize:'13px',marginTop:'3px'}}>{e.code}</div>
                    <div style={{marginTop:'8px',display:'flex',gap:'8px'}}>
                      <span className="badge green">● Present</span>
                      <span className="badge blue">{e.role}</span>
                      <span className="badge gray">Bitmask: {userMask}</span>
                    </div>
                  </div>
                  <div style={{marginLeft:'auto',color:'rgba(255,255,255,0.5)',fontSize:'12px',textAlign:'right'}}>
                    <div>Joined: {e.joined}</div><div style={{marginTop:'4px'}}>{e.dept} · {e.desig}</div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="g2">
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'var(--accent)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Personal Information</div>
                      {[['Date of Birth',e.dob],['Mobile',e.mobile],['Personal Email',e.email],['Date of Joining',e.joined],['PAN Number',e.pan],['Nationality','Indian']].map(([k,v])=>(
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:'12.5px'}}>
                          <span style={{color:'var(--muted)'}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'var(--accent)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Bank Details</div>
                      {[['Bank Name',e.bank],['Account Number',e.acc],['IFSC Code',e.ifsc],['Account Type','Savings Account'],['Monthly Wage',`₹ ${e.wage.toLocaleString('en-IN')}`],['Payable Days',`${e.days} of 22`]].map(([k,v])=>(
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:'12.5px'}}>
                          <span style={{color:'var(--muted)'}}>{k}</span><span style={{fontWeight:600,fontFamily:['IFSC Code','Account Number'].includes(k)?'monospace':'inherit'}}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-hdr">Salary Information — Auto-Computed Structure (Wage: ₹{e.wage.toLocaleString('en-IN')})</div>
                <div className="card-body">
                  <div className="g2">
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#16a34a',marginBottom:'10px',textTransform:'uppercase'}}>Earnings Breakdown</div>
                      {[['Basic Salary','50% of Wage',sal.basic],['HRA','50% of Basic',sal.hra],['Standard Allowance','Fixed ₹4,167',sal.std],['Performance Bonus','8.33% of Basic',sal.perf],['Leave Travel Allowance','8.333% of Basic',sal.lta],['Fixed Allowance','Residual',sal.fixed]].map(([k,note,v])=>(
                        <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',marginBottom:'4px',background:'rgba(34,197,94,0.04)',borderRadius:'8px',border:'1px solid rgba(34,197,94,0.1)',fontSize:'12px'}}>
                          <div><div style={{fontWeight:600}}>{k}</div><div style={{fontSize:'10px',color:'var(--muted)'}}>{note}</div></div>
                          <span style={{fontWeight:700,color:'#16a34a'}}>₹ {v.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div style={{padding:'10px 12px',background:'rgba(34,197,94,0.1)',borderRadius:'8px',display:'flex',justifyContent:'space-between',marginTop:'8px'}}>
                        <span style={{fontWeight:700}}>Gross Earnings</span>
                        <span style={{fontWeight:900,fontSize:'14px',color:'#16a34a'}}>₹ {sal.gross.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#dc2626',marginBottom:'10px',textTransform:'uppercase'}}>Deductions</div>
                      {[['Employee PF','12% of Basic',sal.pf],['Employer PF','12% of Basic (Info)',Math.round(e.wage*0.5*0.12)],['Professional Tax','Statutory',sal.pt],['TDS','Income Tax at Source',sal.tds]].map(([k,note,v])=>(
                        <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',marginBottom:'4px',background:'rgba(239,68,68,0.04)',borderRadius:'8px',border:'1px solid rgba(239,68,68,0.1)',fontSize:'12px'}}>
                          <div><div style={{fontWeight:600}}>{k}</div><div style={{fontSize:'10px',color:'var(--muted)'}}>{note}</div></div>
                          <span style={{fontWeight:700,color:'#dc2626'}}>- ₹ {v.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div style={{marginTop:'16px',padding:'20px',background:'linear-gradient(135deg,#0f172a,#1e1b4b)',borderRadius:'12px',textAlign:'center',color:'#fff'}}>
                        <div style={{fontSize:'11px',opacity:0.5,marginBottom:'4px'}}>Net Take-Home Salary</div>
                        <div style={{fontSize:'32px',fontWeight:900}}>₹ {sal.net.toLocaleString('en-IN')}</div>
                        <div style={{fontSize:'11px',opacity:0.4,marginTop:'4px'}}>For {e.days} payable days of 22</div>
                      </div>
                      <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
                        <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>nav('payroll')}>📄 Download Payslip</button>
                        <button className="btn btn-outline" style={{flex:1,justifyContent:'center'}}>📧 Email Payslip</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>;
          })()}

          {/* ══ EMPLOYEES ══ */}
          {tab==='employees' && <div className="card">
            <div className="card-hdr" style={{flexWrap:'wrap',gap:'8px'}}>
              Employee Directory
              <div style={{position:'relative',marginLeft:'auto'}}>
                <input className="fld" style={{margin:0,width:'230px',paddingLeft:'32px'}} placeholder="Search employees, dept, role..." value={empSearch} onChange={e=>setEmpSearch(e.target.value)}/>
                <span style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}>🔍</span>
              </div>
              <button className="btn btn-outline btn-sm">Dept ▾</button>
              <button className="btn btn-outline btn-sm">Status ▾</button>
              <button className="btn btn-primary btn-sm" onClick={()=>setModal('employee')}>+ Add Employee</button>
              <button className="btn btn-outline btn-sm">📥 Export</button>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th><input type="checkbox"/></th><th>Emp Code</th><th>Name &amp; Role</th><th>Email</th><th>Department</th><th>RBAC Mask</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredEmps.map((e,i)=>(
                    <tr key={i}>
                      <td><input type="checkbox"/></td>
                      <td style={{fontFamily:'monospace',fontSize:'11px',fontWeight:700,color:'var(--muted)'}}>{e.code.slice(0,16)}…</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          <div className="av" style={{background:e.color}}>{e.av}</div>
                          <div>
                            <div style={{fontWeight:700,fontSize:'13px'}}>{e.first} {e.last}</div>
                            <div style={{fontSize:'11px',color:'var(--muted)'}}>{e.desig}</div>
                          </div>
                          {i===0&&<span className="badge blue" style={{fontSize:'9px'}}>You</span>}
                        </div>
                      </td>
                      <td style={{fontSize:'12px'}}>{e.email}</td>
                      <td><span className="badge gray">{e.dept}</span></td>
                      <td><span style={{fontFamily:'monospace',fontSize:'11px',background:'var(--bg)',padding:'2px 6px',borderRadius:'4px',border:'1px solid var(--border)'}}>{e.mask} ({e.role})</span></td>
                      <td><span className={`badge ${e.status==='PRESENT'?'green':e.status==='ON_LEAVE'?'orange':'red'}`}>● {e.status}</span></td>
                      <td style={{display:'flex',gap:'5px'}}>
                        <button className="btn btn-outline btn-xs" onClick={()=>{setProfileEmp(e);setModal('profile');}}>👤</button>
                        <button className="btn btn-outline btn-xs">✏</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ LEAVES ══ */}
          {tab==='leaves' && <div className="card">
            <div className="card-hdr" style={{flexWrap:'wrap',gap:'8px'}}>
              Leave Requests
              <div style={{marginLeft:'auto',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                <button className="btn btn-primary btn-sm" onClick={()=>setModal('leave')}>+ Apply Leave</button>
                <button className="btn btn-outline btn-sm">Employee All ▾</button>
                <button className="btn btn-outline btn-sm">Status All ▾</button>
                <button className="btn btn-outline btn-sm">📥 Export</button>
              </div>
            </div>
            <div style={{padding:'8px 16px',background:'var(--bg)',borderBottom:'1px solid var(--border)',display:'flex',gap:'16px',fontSize:'12px'}}>
              {[{t:'Paid Time Off',v:14,c:'green'},{t:'Sick Leave',v:7,c:'orange'},{t:'Casual Leave',v:5,c:'blue'}].map((b,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <span className={`badge ${b.c}`}>{b.v} days</span><span style={{color:'var(--muted)'}}>{b.t}</span>
                </div>
              ))}
            </div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th><input type="checkbox"/></th><th>Employee</th><th>Leave Date</th><th>Days</th><th>Type</th><th>Paid</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {leaves.map((l,i)=>(
                    <tr key={i}>
                      <td><input type="checkbox"/></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div className="av av-sm" style={{background:'#6366f1'}}>{l.emp.split(' ').map(w=>w[0]).join('')}</div>
                          <div><div style={{fontWeight:600,fontSize:'13px'}}>{l.emp}</div><div style={{fontSize:'11px',color:'var(--muted)'}}>{l.desig}</div></div>
                        </div>
                      </td>
                      <td style={{fontSize:'12px'}}>{l.from}{l.to!==l.from?` → ${l.to}`:''}</td>
                      <td><span className="badge gray">{l.days}d</span></td>
                      <td><span className={`badge ${l.type.includes('Sick')?'red':l.type.includes('Casual')||l.type.includes('Privilege')?'blue':l.type.includes('Maternity')?'orange':'gray'}`}>{l.type}</span></td>
                      <td>{l.paid?<span className="badge green">Paid</span>:<span className="badge red">Unpaid</span>}</td>
                      <td><span className={`badge ${l.status==='APPROVED'?'green':l.status==='PENDING'?'orange':'red'}`}>● {l.status}</span></td>
                      <td style={{display:'flex',gap:'5px'}}>
                        {l.status==='PENDING' && <>
                          <button className="btn btn-success btn-xs" onClick={()=>setLeaves(ls=>ls.map((x,j)=>j===i?{...x,status:'APPROVED'}:x))}>✓</button>
                          <button className="btn btn-danger btn-xs" onClick={()=>setLeaves(ls=>ls.map((x,j)=>j===i?{...x,status:'REJECTED'}:x))}>✕</button>
                        </>}
                        {l.status!=='PENDING' && <button className="btn btn-outline btn-xs">⋯</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ SHIFT ROSTER ══ */}
          {tab==='shift' && <div className="card">
            <div className="card-hdr" style={{flexWrap:'wrap',gap:'8px'}}>
              Shift Roster — Week Jun 30 – Jul 6, 2026
              <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
                <button className="btn btn-outline btn-sm">‹ Prev Week</button>
                <button className="btn btn-outline btn-sm">Next Week ›</button>
                <button className="btn btn-outline btn-sm">Employee All ▾</button>
                <button className="btn btn-primary btn-sm">📥 Export</button>
              </div>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Employee</th>{['Mon 30','Tue 1','Wed 2','Thu 3','Fri 4','Sat 5','Sun 6'].map(d=><th key={d} style={{textAlign:'center'}}>{d}</th>)}</tr></thead>
                <tbody>
                  {SHIFTS.map((s,i)=>(
                    <tr key={i}>
                      <td><div style={{display:'flex',alignItems:'center',gap:'8px'}}><div className="av av-sm" style={{background:s.color}}>{s.av}</div><div><div style={{fontWeight:600,fontSize:'13px'}}>{s.name}</div><div style={{fontSize:'11px',color:'var(--muted)'}}>{s.desig}</div></div></div></td>
                      {s.shifts.map((sh,j)=>(
                        <td key={j} style={{padding:'8px'}}>
                          <div style={{background:sh==='General'?'#eff6ff':sh==='Night'?'#1e1b4b':sh==='Maternity'?'#d1fae5':sh==='Saturday'||sh==='Sunday'?'var(--bg)':'#fef3c7',color:sh==='Night'?'#fff':sh==='Saturday'||sh==='Sunday'?'var(--muted)':'var(--text)',borderRadius:'6px',padding:'4px 8px',fontSize:'11px',fontWeight:600,textAlign:'center',whiteSpace:'nowrap',border:`1px solid ${sh==='General'?'#bfdbfe':sh==='Night'?'#4c1d95':sh==='Maternity'?'#6ee7b7':'var(--border)'}`}}>
                            {sh==='Saturday'||sh==='Sunday'?`⭐ ${sh}`:sh==='Maternity'?'🌿 Mat.Leave':sh==='Night'?'🌙 Night':sh}
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
          {tab==='attendance' && <>
            <div className="card">
              <div className="card-hdr" style={{flexWrap:'wrap',gap:'8px'}}>
                Attendance — July 2026
                <div style={{marginLeft:'auto',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <button className="btn btn-primary btn-sm" onClick={()=>setModal('attendance')}>✔ Mark Attendance</button>
                  <button className="btn btn-outline btn-sm">📥 Import</button>
                  <button className="btn btn-outline btn-sm">📥 Export</button>
                  <button className="btn btn-outline btn-sm">Employee All ▾</button>
                  <button className="btn btn-outline btn-sm">Month: July ▾</button>
                </div>
              </div>
              <div style={{padding:'8px 16px',background:'var(--bg)',fontSize:'11.5px',display:'flex',gap:'14px',flexWrap:'wrap',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                {[{s:'⭐',l:'Holiday'},{s:'✔',l:'Present',c:'#22c55e'},{s:'✈',l:'On Leave',c:'#f59e0b'},{s:'✖',l:'Absent',c:'#ef4444'},{s:'○',l:'Day Off',c:'#94a3b8'}].map((l,i)=>(
                  <span key={i} style={{display:'flex',alignItems:'center',gap:'4px',color:'var(--muted)'}}><span style={{color:l.c||'#fbbf24',fontWeight:700}}>{l.s}</span>{l.l}</span>
                ))}
              </div>
              <div className="tbl-wrap">
                <table style={{fontSize:'11px'}}>
                  <thead><tr>
                    <th style={{minWidth:'170px',position:'sticky',left:0,background:'var(--bg)',zIndex:1}}>Employee</th>
                    {Array.from({length:31},(_,i)=><th key={i} style={{padding:'6px 3px',textAlign:'center',minWidth:'26px',fontWeight:700}}>{i+1}</th>)}
                    <th>Total</th>
                  </tr></thead>
                  <tbody>
                    {ATT_GRID.map((emp,i)=>{
                      const present=emp.days.filter(d=>d==='P').length;
                      return (
                        <tr key={i}>
                          <td style={{position:'sticky',left:0,background:'var(--card)',zIndex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:'7px'}}><div className="av av-sm" style={{background:emp.color}}>{emp.av}</div><div><div style={{fontWeight:600}}>{emp.name}</div><div style={{color:'var(--muted)'}}>{emp.desig}</div></div></div>
                          </td>
                          {emp.days.map((d,j)=>(
                            <td key={j} style={{textAlign:'center',padding:'4px 1px'}}>
                              <span style={{color:d==='P'?'#22c55e':d==='A'?'#ef4444':d==='L'?'#f59e0b':d==='H'?'#fbbf24':'#94a3b8',fontWeight:700,fontSize:'13px'}}>
                                {d==='P'?'✔':d==='A'?'✖':d==='L'?'✈':d==='H'?'⭐':'○'}
                              </span>
                            </td>
                          ))}
                          <td style={{fontWeight:700,color:'var(--accent)',textAlign:'center'}}>{present}/31</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="att-hero">
              <div className="att-timer">{fmt(secs)}</div>
              <div className="att-lbl">Active Session Duration — {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
              <div className="att-btns">
                <button className="att-btn att-btn-in" disabled={clockedIn} onClick={toggleClock}>⏱️ Clock In</button>
                <button className="att-btn att-btn-out" disabled={!clockedIn} onClick={toggleClock}>⏰ Clock Out</button>
                <button className="att-btn" style={{background:'#334155',color:'#fff'}} onClick={()=>setModal('attendance')}>📝 Manual Mark</button>
              </div>
            </div>
          </>}

          {/* ══ PAYROLL ══ */}
          {tab==='payroll' && <>
            <div className="banner" style={{background:'#f0fdf4',color:'#166534',borderColor:'#bbf7d0'}}>
              💰 July 2026 Payroll processed. {EMPS.length} payslips generated. Salary auto-computed using: Basic(50%) + HRA(50% of Basic) + PB(8.33%) + LTA(8.333%) + Fixed(Residual) − PF(12%) − TDS − PT.
            </div>
            <div className="g2">
              <div className="card">
                <div className="card-hdr">Select Employee</div>
                <div style={{maxHeight:'340px',overflowY:'auto'}}>
                  {EMPS.map((e,i)=>{
                    const s=compileSalary(e.wage,e.days);
                    return (
                      <div key={i} onClick={()=>setSelectedPayEmp(e)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 16px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:selectedPayEmp.id===e.id?'var(--sb-active)':'var(--card)',transition:'background 0.12s'}}>
                        <div className="av av-sm" style={{background:e.color}}>{e.av}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:'13px',color:selectedPayEmp.id===e.id?'#fff':'var(--text)'}}>{e.first} {e.last}</div>
                          <div style={{fontSize:'11px',color:selectedPayEmp.id===e.id?'rgba(255,255,255,0.5)':'var(--muted)'}}>{e.code.slice(0,18)}… · {e.days}d</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontWeight:700,fontSize:'13px',color:'#22c55e'}}>₹{s.net.toLocaleString('en-IN')}</div>
                          <div style={{fontSize:'10px',color:selectedPayEmp.id===e.id?'rgba(255,255,255,0.4)':'var(--muted)'}}>Net Take-Home</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card">
                <div className="card-hdr">Payslip — {selectedPayEmp.first} {selectedPayEmp.last} <span className="badge blue">July 2026</span></div>
                <div className="card-body">
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#16a34a',marginBottom:'8px',textTransform:'uppercase'}}>Earnings</div>
                      {[['Basic Salary',salaryData.basic],['HRA',salaryData.hra],['Standard Allowance',salaryData.std],['Performance Bonus',salaryData.perf],['LTA',salaryData.lta],['Fixed Allowance',salaryData.fixed]].map(([k,v])=>(
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:'12px'}}>
                          <span style={{color:'var(--muted)'}}>{k}</span><span style={{fontWeight:700}}>₹ {v.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div style={{display:'flex',justifyContent:'space-between',padding:'8px',marginTop:'6px',background:'rgba(34,197,94,0.08)',borderRadius:'8px'}}>
                        <span style={{fontWeight:700}}>Gross</span><span style={{fontWeight:900,color:'#16a34a'}}>₹ {salaryData.gross.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,color:'#dc2626',marginBottom:'8px',textTransform:'uppercase'}}>Deductions</div>
                      {[['PF (Employee 12%)',salaryData.pf],['Professional Tax',salaryData.pt],['TDS (Income Tax)',salaryData.tds]].map(([k,v])=>(
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:'12px'}}>
                          <span style={{color:'var(--muted)'}}>{k}</span><span style={{fontWeight:700,color:'#dc2626'}}>- ₹ {v.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div style={{display:'flex',justifyContent:'space-between',padding:'8px',marginTop:'6px',background:'rgba(239,68,68,0.08)',borderRadius:'8px'}}>
                        <span style={{fontWeight:700}}>Total Deductions</span><span style={{fontWeight:900,color:'#dc2626'}}>₹ {(salaryData.pf+salaryData.pt+salaryData.tds).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:'22px',background:'linear-gradient(135deg,#0f172a,#1e1b4b)',borderRadius:'14px',textAlign:'center',color:'#fff'}}>
                    <div style={{fontSize:'11px',opacity:0.5,marginBottom:'4px'}}>Net Payable Salary</div>
                    <div style={{fontSize:'36px',fontWeight:900,letterSpacing:'-1px'}}>₹ {salaryData.net.toLocaleString('en-IN')}</div>
                    <div style={{fontSize:'11px',opacity:0.4,marginTop:'4px'}}>For {selectedPayEmp.days} payable days · Payroll Engine v2.0</div>
                  </div>
                  <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                    <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}}>📄 Download PDF</button>
                    <button className="btn btn-outline" style={{flex:1,justifyContent:'center'}}>📧 Email Payslip</button>
                  </div>
                </div>
              </div>
            </div>
          </>}

          {/* ══ HOLIDAY ══ */}
          {tab==='holiday' && <div className="card">
            <div className="card-hdr">Holiday Calendar — 2026 <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}}>+ Add Holiday</button></div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>#</th><th>Holiday</th><th>Date</th><th>Day</th><th>Type</th><th>Region</th></tr></thead>
                <tbody>
                  {[['Republic Day','2026-01-26','Monday','National','All India'],['Holi','2026-03-29','Sunday','Festival','North India'],['Good Friday','2026-04-03','Friday','National','All India'],['Eid ul-Fitr','2026-04-21','Tuesday','Festival','All India'],['Independence Day','2026-08-15','Saturday','National','All India'],['Gandhi Jayanti','2026-10-02','Friday','National','All India'],['Diwali','2026-11-08','Sunday','Festival','All India'],['Christmas','2026-12-25','Friday','National','All India']].map(([name,date,day,type,region],i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:700,color:'var(--muted)'}}>{i+1}</td>
                      <td style={{fontWeight:600}}>{name}</td>
                      <td style={{fontFamily:'monospace',fontSize:'12px'}}>{date}</td>
                      <td>{day}</td>
                      <td><span className={`badge ${type==='National'?'blue':'orange'}`}>{type}</span></td>
                      <td style={{fontSize:'12px',color:'var(--muted)'}}>{region}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ CLIENTS ══ */}
          {tab==='clients' && <div className="card">
            <div className="card-hdr">Client Directory <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}}>+ Add Client</button></div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Client</th><th>Industry</th><th>Contact</th><th>Projects</th><th>Revenue</th><th>Status</th></tr></thead>
                <tbody>
                  {[{n:'Authority Entrepreneurs',i:'Consulting',e:'authority@ent.com',p:3,r:'₹12.4L',s:'Active'},{n:'Global Tech Solutions',i:'Technology',e:'contact@globaltech.in',p:2,r:'₹8.2L',s:'Active'},{n:'Sharma & Associates',i:'Finance',e:'info@sharmaassoc.in',p:1,r:'₹3.5L',s:'On Hold'}].map((c,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:700}}>{c.n}</td><td>{c.i}</td><td style={{fontSize:'12px'}}>{c.e}</td>
                      <td><span className="badge blue">{c.p} projects</span></td>
                      <td style={{fontWeight:700,color:'#16a34a'}}>{c.r}</td>
                      <td><span className={`badge ${c.s==='Active'?'green':'orange'}`}>{c.s}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ PROJECTS ══ */}
          {tab==='projects' && <div className="card">
            <div className="card-hdr" style={{flexWrap:'wrap',gap:'8px'}}>
              Projects
              <div style={{marginLeft:'auto',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                <button className="btn btn-primary btn-sm" onClick={()=>setModal('project')}>+ Add Project</button>
                <button className="btn btn-outline btn-sm">📥 Import</button>
                <button className="btn btn-outline btn-sm">Status All ▾</button>
                <button className="btn btn-outline btn-sm">🔧 Filters</button>
              </div>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th><input type="checkbox"/></th><th>Code</th><th>Project Name</th><th>Members</th><th>Start</th><th>Deadline</th><th>Client</th><th>Progress &amp; Status</th><th>Action</th></tr></thead>
                <tbody>
                  {projects.map((p,i)=>(
                    <tr key={i}>
                      <td><input type="checkbox"/></td>
                      <td style={{fontWeight:700,fontSize:'11px',color:'var(--muted)',fontFamily:'monospace'}}>{p.code}</td>
                      <td style={{fontWeight:600,fontSize:'13px'}}>{p.name}</td>
                      <td><div style={{display:'flex'}}>{p.members.map((m,j)=><div key={j} className="av av-sm" style={{background:'#6366f1',marginLeft:j?'-6px':'0',border:'2px solid var(--card)'}}>{m}</div>)}</div></td>
                      <td style={{fontSize:'12px',color:'var(--muted)'}}>{p.start}</td>
                      <td style={{fontSize:'12px',color:'var(--muted)'}}>{p.end}</td>
                      <td style={{fontSize:'12px'}}>{p.client}</td>
                      <td>
                        <span className={`badge ${p.status==='In Progress'?'blue':p.status==='Completed'?'green':'orange'}`}>{p.status}</span>
                        <div className="progress-bg" style={{marginTop:'5px'}}><div className="progress-fill" style={{width:`${p.pct}%`,background:p.status==='On Hold'?'var(--warning)':'var(--accent)'}}></div></div>
                        <div style={{fontSize:'10px',color:'var(--muted)',marginTop:'2px'}}>{p.pct}% complete</div>
                      </td>
                      <td><button className="btn btn-outline btn-xs">⋯</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ TASKS ══ */}
          {tab==='tasks' && <div className="card">
            <div className="card-hdr" style={{flexWrap:'wrap',gap:'8px'}}>
              Tasks
              <div style={{marginLeft:'auto',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                <button className="btn btn-primary btn-sm" onClick={()=>setModal('task')}>+ Add Task</button>
                <button className="btn btn-outline btn-sm">👤 My Tasks</button>
                <button className="btn btn-outline btn-sm">Status ▾</button>
                <button className="btn btn-outline btn-sm">Priority ▾</button>
              </div>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th><input type="checkbox"/></th><th>Code</th><th>Task</th><th>Start</th><th>Due Date</th><th>Hours</th><th>Assignee</th><th>Status</th></tr></thead>
                <tbody>
                  {tasks.map((t,i)=>{
                    const overdue=t.status!=='Done'&&t.due<new Date().toISOString().split('T')[0];
                    return (
                      <tr key={i}>
                        <td><input type="checkbox"/></td>
                        <td style={{fontWeight:700,fontSize:'11px',fontFamily:'monospace',color:'var(--muted)'}}>{t.code}</td>
                        <td>
                          <div style={{fontWeight:500,fontSize:'13px',maxWidth:'300px'}}>{t.desc}</div>
                          <span className={`badge ${t.pri==='High'?'red':t.pri==='Medium'?'orange':'gray'}`} style={{fontSize:'9px',marginTop:'3px'}}>{t.pri}</span>
                        </td>
                        <td style={{fontSize:'12px',color:'var(--muted)'}}>{t.start}</td>
                        <td style={{fontSize:'12px',fontWeight:overdue?700:400,color:overdue?'var(--danger)':'var(--text)'}}>{t.due}{overdue&&<span className="badge red" style={{fontSize:'9px',marginLeft:'6px'}}>OVERDUE</span>}</td>
                        <td style={{fontSize:'12px'}}>{t.hrs}</td>
                        <td><div className="av av-sm" style={{background:'#6366f1'}}>{t.assign}</div></td>
                        <td>
                          <select value={t.status} onChange={e=>setTasks(ts=>ts.map((x,j)=>j===i?{...x,status:e.target.value}:x))} style={{background:'transparent',border:'1px solid var(--border)',borderRadius:'6px',padding:'3px 6px',fontSize:'11px',color:'var(--text)',cursor:'pointer'}}>
                            <option>Todo</option><option>Doing</option><option>Done</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ TICKETS ══ */}
          {tab==='tickets' && <div className="card">
            <div className="card-hdr">Support Tickets <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}} onClick={()=>alert('Ticket form — connect to backend API')}>+ New Ticket</button></div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Ticket #</th><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {TICKETS.map((t,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:700,fontFamily:'monospace',fontSize:'12px'}}>{t.id}</td>
                      <td style={{fontWeight:500,maxWidth:'280px'}}>{t.subj}</td>
                      <td><span className="badge gray">{t.cat}</span></td>
                      <td><span className={`badge ${t.pri==='High'?'red':t.pri==='Medium'?'orange':'gray'}`}>{t.pri}</span></td>
                      <td><span className={`badge ${t.status==='OPEN'?'blue':t.status==='IN_PROGRESS'?'orange':'green'}`}>{t.status}</span></td>
                      <td style={{fontSize:'12px',color:'var(--muted)'}}>{t.date}</td>
                      <td><button className="btn btn-outline btn-xs">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ══ NOTICES ══ */}
          {tab==='notices' && <div className="card">
            <div className="card-hdr">Corporate Notice Board <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}}>+ Post Notice</button></div>
            <div className="card-body">
              {NOTICES.map((n,i)=>(
                <div className="notice-item" key={i}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'5px'}}>
                    <span className={`badge ${n.pri==='HIGH'?'red':n.pri==='MEDIUM'?'orange':'gray'}`}>{n.pri}</span>
                    <div className="notice-title">{n.title}</div>
                    <span style={{marginLeft:'auto',fontSize:'11px',color:'var(--muted)'}}>📅 {n.date}</span>
                  </div>
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
