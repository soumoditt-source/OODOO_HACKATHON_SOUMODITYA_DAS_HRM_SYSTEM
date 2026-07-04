import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [portal, setPortal] = useState('admin');
  const [email, setEmail] = useState('soumoditya@hrms.in');
  const [password, setPassword] = useState('admin@2026');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hrOpen, setHrOpen] = useState(true);
  const [workOpen, setWorkOpen] = useState(true);

  // States for DB data
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, leaves: 0 });
  const [leaves, setLeaves] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [notices, setNotices] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payslips, setPayslips] = useState([]);

  // Attendance Clock States
  const [clockedIn, setClockedIn] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Three.js Login Background Canvas
  const canvasRef = useRef(null);
  useEffect(() => {
    if (token || !canvasRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
    const material = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true });
    const torus = new THREE.Mesh(geometry, material);
    scene.add(torus);

    camera.position.z = 30;

    const animate = () => {
      requestAnimationFrame(animate);
      torus.rotation.x += 0.01;
      torus.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [token]);

  // Fetch data on login
  useEffect(() => {
    if (token) {
      fetchStats();
      fetchEmployees();
      fetchLeaves();
      fetchTickets();
      fetchNotices();
      fetchPayslips();
      fetchAttendance();
    }
  }, [token]);

  const fetchStats = () => {
    fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  };

  const fetchEmployees = () => {
    fetch('/api/employees', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setEmployees(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchLeaves = () => {
    fetch('/api/leaves', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setLeaves(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchTickets = () => {
    fetch('/api/tickets', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setTickets(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchNotices = () => {
    fetch('/api/notices', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setNotices(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchPayslips = () => {
    fetch('/api/payroll/myslip', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPayslips(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchAttendance = () => {
    fetch('/api/attendance/me', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAttendance(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email.includes('@')) {
      alert("Invalid email format!");
      return;
    }
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, portal })
    })
    .then(res => {
      if (!res.ok) throw new Error("Invalid credentials");
      return res.json();
    })
    .then(data => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    })
    .catch(err => alert(err.message));
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  const toggleClock = () => {
    const type = clockedIn ? 'OUT' : 'IN';
    fetch('/api/attendance/tick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type })
    })
    .then(res => res.json())
    .then(() => {
      setClockedIn(!clockedIn);
      if (!clockedIn) {
        timerRef.current = setInterval(() => {
          setSeconds(s => s + 1);
        }, 1000);
      } else {
        clearInterval(timerRef.current);
        setSeconds(0);
      }
      fetchAttendance();
      fetchStats();
    })
    .catch(console.error);
  };

  const formatTimer = (sec) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (!token) {
    return (
      <div className="login-overlay">
        <canvas ref={canvasRef} className="login-canvas" />
        <div className="login-card">
          <div className="login-logo">O</div>
          <div className="login-title">Odoo HRMS Portal</div>
          <div className="login-sub">Enterprise Management System</div>
          
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
            <button type="submit" className="login-btn">Secure Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-icon">O</div>
          <div className="sb-company">Odoo Suite <span>Soumoditya Das</span></div>
        </div>

        <div className="sb-user">
          <div className="sb-avatar">SD</div>
          <div>
            <div className="sb-uname">{user?.name}</div>
            <div className="sb-urole">{user?.portal_role}</div>
          </div>
          <div className="online"></div>
        </div>

        <div style={{ padding: '10px 0' }}>
          <div className={`sb-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="sb-icon">📊</span> Dashboard
          </div>
          <div className={`sb-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
            <span className="sb-icon">📅</span> My Calendar
          </div>
          <div className="sb-item" onClick={() => setActiveTab('clients')}>
            <span className="sb-icon">💼</span> Clients
          </div>

          {/* HR Submenu */}
          <div className="sb-section" onClick={() => setHrOpen(!hrOpen)} style={{ cursor: 'pointer' }}>
            HR <span className={`sb-arrow ${hrOpen ? 'open' : ''}`}>›</span>
          </div>
          {hrOpen && (
            <div className="sub-nav">
              {user?.portal_role !== 'EMPLOYEE' && (
                <div className={`sb-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                  Employees
                </div>
              )}
              <div className={`sb-item ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveTab('leaves')}>
                Leaves
              </div>
              <div className="sb-item" onClick={() => setActiveTab('shift-roster')}>Shift Roster</div>
              <div className={`sb-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
                Attendance
              </div>
              <div className="sb-item" onClick={() => setActiveTab('holiday')}>Holiday</div>
              <div className="sb-item" onClick={() => setActiveTab('appreciation')}>Appreciation</div>
            </div>
          )}

          {/* Work Submenu */}
          <div className="sb-section" onClick={() => setWorkOpen(!workOpen)} style={{ cursor: 'pointer' }}>
            Work <span className={`sb-arrow ${workOpen ? 'open' : ''}`}>›</span>
          </div>
          {workOpen && (
            <div className="sub-nav">
              <div className="sb-item">Projects</div>
              <div className="sb-item">Tasks</div>
              <div className="sb-item">Timesheet</div>
            </div>
          )}

          <div className={`sb-item ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
            <span className="sb-icon">🎟️</span> Tickets
          </div>
          <div className="sb-item"><span className="sb-icon">🔔</span> Events</div>
          <div className="sb-item"><span className="sb-icon">💬</span> Messages</div>
          <div className={`sb-item ${activeTab === 'notices' ? 'active' : ''}`} onClick={() => setActiveTab('notices')}>
            <span className="sb-icon">📢</span> Notice Board
          </div>
          <div className="sb-item"><span className="sb-icon">📖</span> Knowledge Base</div>
          <div className="sb-item"><span className="sb-icon">⚙️</span> Settings</div>
        </div>

        <div className="sb-version">v5.5.25 · Production Build</div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="main">
        <header className="topbar">
          <div className="tb-breadcrumb">
            <span className="tb-title">{activeTab.toUpperCase()}</span>
          </div>

          <div className="tb-clock">
            <div className="tb-time">{time}</div>
            <div className="tb-day">Odoo Enterprise</div>
          </div>

          <button className={`clock-btn ${clockedIn ? 'out' : ''}`} onClick={toggleClock}>
            {clockedIn ? '⏰ Clock Out' : '⏱️ Clock In'}
          </button>

          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </header>

        <div className="content">
          {/* DASHBOARD PAGE */}
          {activeTab === 'dashboard' && (
            <div className="page active">
              <div className="banner">
                🚀 Welcome to Odoo Enterprise Portal. Today is a productive working day!
              </div>

              <div className="g4 mb-20">
                <div className="card kpi">
                  <div className="kpi-lbl">Total Workforce</div>
                  <div className="kpi-val blue">{stats.total}</div>
                  <div className="kpi-sub">Active Employees</div>
                </div>
                <div className="card kpi">
                  <div className="kpi-lbl">Present Today</div>
                  <div className="kpi-val green">{stats.present}</div>
                  <div className="kpi-sub">In Office / WFH</div>
                </div>
                <div className="card kpi">
                  <div className="kpi-lbl">On Leave Today</div>
                  <div className="kpi-val orange">{stats.onLeave}</div>
                  <div className="kpi-sub">Approved Leaves</div>
                </div>
                <div className="card kpi">
                  <div className="kpi-lbl">Open Tickets</div>
                  <div className="kpi-val red">{stats.openTickets}</div>
                  <div className="kpi-sub">IT & Software</div>
                </div>
              </div>

              <div className="g2">
                <div className="card">
                  <div className="card-hdr">Employee Profile Summary</div>
                  <div className="card-body">
                    <div className="profile-card">
                      <div className="profile-av">SD</div>
                      <div>
                        <div className="profile-name">{user?.name}</div>
                        <div className="profile-role">{user?.portal_role}</div>
                        <div className="profile-id">{user?.email}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-hdr">Notice Board Feed</div>
                  <div className="card-body">
                    {notices.map((n, i) => (
                      <div className="notice-item" key={i}>
                        <div className="notice-title">{n.title}</div>
                        <div className="notice-body">{n.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EMPLOYEES PAGE */}
          {activeTab === 'employees' && (
            <div className="card page active">
              <div className="card-hdr">Employee Directory</div>
              <div className="card-body tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => (
                      <tr key={i}>
                        <td className="font-bold">{emp.emp_code}</td>
                        <td>{emp.first_name} {emp.last_name}</td>
                        <td>{emp.email}</td>
                        <td>{emp.portal_role}</td>
                        <td>
                          <span className={`badge ${emp.status === 'ACTIVE' ? 'green' : 'red'}`}>
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LEAVES PAGE */}
          {activeTab === 'leaves' && (
            <div className="card page active">
              <div className="card-hdr">Leave Requests</div>
              <div className="card-body tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Days</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l, i) => (
                      <tr key={i}>
                        <td>{l.emp_name || 'My Leave'}</td>
                        <td>{l.leave_type}</td>
                        <td>{l.from_date}</td>
                        <td>{l.to_date}</td>
                        <td>{l.days}</td>
                        <td>
                          <span className={`badge ${l.status === 'APPROVED' ? 'green' : l.status === 'PENDING' ? 'orange' : 'red'}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ATTENDANCE PAGE */}
          {activeTab === 'attendance' && (
            <div className="page active">
              <div className="att-hero">
                <div className="att-timer">{formatTimer(seconds)}</div>
                <div className="att-lbl">Active Session Duration</div>
                <div className="att-btns">
                  <button className="att-btn att-btn-in" disabled={clockedIn} onClick={toggleClock}>Clock In</button>
                  <button className="att-btn att-btn-out" disabled={!clockedIn} onClick={toggleClock}>Clock Out</button>
                </div>
              </div>

              <div className="card">
                <div className="card-hdr">My Clock Log</div>
                <div className="card-body tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Work Mins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((a, i) => (
                        <tr key={i}>
                          <td>{a.date}</td>
                          <td>{a.check_in ? new Date(a.check_in).toLocaleTimeString() : '--'}</td>
                          <td>{a.check_out ? new Date(a.check_out).toLocaleTimeString() : '--'}</td>
                          <td>{a.work_mins} mins</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TICKETS PAGE */}
          {activeTab === 'tickets' && (
            <div className="card page active">
              <div className="card-hdr">Support Tickets</div>
              <div className="card-body tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t, i) => (
                      <tr key={i}>
                        <td>{t.subject}</td>
                        <td>{t.category}</td>
                        <td>{t.priority}</td>
                        <td><span className="badge orange">{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NOTICES PAGE */}
          {activeTab === 'notices' && (
            <div className="card page active">
              <div className="card-hdr">Corporate Notices</div>
              <div className="card-body">
                {notices.map((n, i) => (
                  <div className="notice-item" key={i}>
                    <div className="notice-title" style={{ fontSize: '15px', color: 'var(--accent)' }}>{n.title}</div>
                    <div className="notice-meta">Posted on {n.created_at || 'Recently'}</div>
                    <div className="notice-body">{n.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MY CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="card page active">
              <div className="card-hdr">Company Calendar</div>
              <div className="card-body cal-grid">
                <div className="cal-head">Mon</div>
                <div className="cal-head">Tue</div>
                <div className="cal-head">Wed</div>
                <div className="cal-head">Thu</div>
                <div className="cal-head">Fri</div>
                <div className="cal-head">Sat</div>
                <div className="cal-head">Sun</div>
                {Array.from({ length: 35 }).map((_, i) => {
                  const dayNum = (i % 31) + 1;
                  return (
                    <div className={`cal-cell ${i === 4 ? 'today' : ''}`} key={i}>
                      <div className="cal-date">{dayNum}</div>
                      {i === 4 && <div className="cal-ev green">Preeti (Present)</div>}
                      {i === 5 && <div className="cal-ev red">Priya (Leave)</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
