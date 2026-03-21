'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CampusMap from '@/components/CampusMap';
import SystemHealth from '@/components/SystemHealth';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { RadialBarChart, RadialBar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const mockStudents = [
    { id: 1, name: 'Rishabh Jain', roll: 'CS2021001', dept: 'CS', attendance: 91, rfid: 'A7B45C', status: 'present' },
    { id: 2, name: 'Priya Sharma', roll: 'CS2021002', dept: 'CS', attendance: 78, rfid: 'B8C56D', status: 'absent' },
    { id: 3, name: 'Arjun Singh', roll: 'CS2021003', dept: 'IT', attendance: 85, rfid: 'C9D67E', status: 'present' },
    { id: 4, name: 'Sneha Patel', roll: 'CS2021004', dept: 'ECE', attendance: 95, rfid: 'D0E78F', status: 'present' },
    { id: 5, name: 'Rahul Kumar', roll: 'CS2021005', dept: 'ME', attendance: 62, rfid: 'E1F89G', status: 'absent' },
];

const weeklyData = [
    { day: 'Mon', present: 38, absent: 7 },
    { day: 'Tue', present: 41, absent: 4 },
    { day: 'Wed', present: 35, absent: 10 },
    { day: 'Thu', present: 42, absent: 3 },
    { day: 'Fri', present: 39, absent: 6 },
];

const deptData = [
    { name: 'CS', students: 18 },
    { name: 'IT', students: 12 },
    { name: 'ECE', students: 10 },
    { name: 'ME', students: 8 },
];

export default function AdminDashboard() {
    const [time, setTime] = useState('');
    const [alerts, setAlerts] = useState([
        { id: 1, type: 'security', msg: 'Multi-person entry detected at Gate A', time: '10:03 AM' },
        { id: 2, type: 'warning', msg: 'Rahul Kumar attendance below 65%', time: '09:45 AM' },
        { id: 3, type: 'info', msg: 'Priya Sharma marked absent – CS201', time: '09:30 AM' },
    ]);

    const [students, setStudents] = useState(mockStudents);
    const [stats, setStats] = useState(statCards);

    useEffect(() => {
        const tick = () => setTime(new Date().toLocaleTimeString('en-IN'));
        tick();
        const t = setInterval(tick, 1000);

        if (isFirebaseConfigured) {
            // Real-time Students
            const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'), limit(5));
            const unsubStudents = onSnapshot(studentsQuery, (snap) => {
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (data.length > 0) setStudents(data);
            });

            // Real-time Alerts
            const alertsQuery = query(collection(db, 'entry_logs'), where('security_alert', '==', true), orderBy('entry_time', 'desc'), limit(5));
            const unsubAlerts = onSnapshot(alertsQuery, (snap) => {
                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    type: 'security',
                    msg: `Alert: ${doc.data().sensor_count} persons detected at ${doc.data().gate_id}`,
                    time: new Date(doc.data().entry_time?.toDate()).toLocaleTimeString()
                }));
                if (data.length > 0) setAlerts(data);
            });

            return () => {
                clearInterval(t);
                unsubStudents();
                unsubAlerts();
            };
        }

        return () => clearInterval(t);
    }, []);

    const statCards = [
        { icon: '🧑‍🎓', label: 'Total Students', value: '248', change: '+3 this month', up: true, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
        { icon: '👨‍🏫', label: 'Teachers', value: '18', change: '2 pending', up: false, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        { icon: '✅', label: 'Present Today', value: '212', change: '84% rate', up: true, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
        { icon: '🚪', label: 'Gate Entries', value: '234', change: '12 alerts', up: false, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    ];

    return (
        <DashboardLayout title="Admin Dashboard" breadcrumb="Overview">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Admin Control Center</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>18 March 2026 · {time} · System Online</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <a href="/admin/students" className="btn btn-ghost btn-sm">🧑‍🎓 Students</a>
                    <a href="/admin/entry-logs" className="btn btn-ghost btn-sm">🚪 Entry Logs</a>
                    <a href="/admin/reports" className="btn btn-primary btn-sm">📊 Reports</a>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {stats.map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-icon" style={{ background: s.bg }}>
                            <span style={{ fontSize: 26 }}>{s.icon}</span>
                        </div>
                        <div className="stat-info">
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                            <div className={`stat-change ${s.up ? 'up' : 'down'}`}>{s.change}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Weekly Attendance */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📈 Weekly Attendance</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={weeklyData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 13 }}
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            />
                            <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Present" />
                            <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Department Distribution */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🏫 Department Split</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={deptData} dataKey="students" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={4}>
                                {deptData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
                            <Legend formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Campus Map */}
                <div style={{ gridColumn: 'span 2' }}>
                    <CampusMap activeGates={['main_gate']} />
                </div>
            </div>

            {/* Students Table + Alerts */}
            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Recent Students */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>🧑‍🎓 Students Overview</h3>
                        <a href="/admin/students" className="btn btn-ghost btn-sm">View All →</a>
                    </div>
                    <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>RFID</th>
                                    <th>Attendance</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="avatar avatar-sm" style={{ background: (s.attendance || 0) > 75 ? 'var(--grad-blue)' : 'var(--grad-amber)' }}>
                                                    {s.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.roll_no || s.roll}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-cyan)' }}>{s.rfid_uid || s.rfid}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, maxWidth: 70 }}>
                                                    <div className="progress-bar" style={{ height: 5 }}>
                                                        <div className={`progress-fill ${(s.attendance || 0) >= 75 ? 'green' : 'amber'}`} style={{ width: `${s.attendance || 0}%` }} />
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>{s.attendance || 0}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${s.status === 'present' ? 'success' : 'danger'}`}>
                                                {s.status === 'present' ? '✓ Present' : '✕ Absent'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Security Alerts */}
                <div>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔔 Live Alerts</h3>
                        {alerts.map(a => (
                            <div key={a.id} style={{
                                display: 'flex', gap: 12, padding: '12px 0',
                                borderBottom: '1px solid var(--border)',
                            }}>
                                <div style={{ fontSize: 20, flexShrink: 0 }}>
                                    {a.type === 'security' ? '🚨' : a.type === 'warning' ? '⚠️' : 'ℹ️'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.msg}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{a.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="card">
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>⚡ Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { icon: '➕', label: 'Add New Student', href: '/admin/students', color: '#3b82f6' },
                                { icon: '👨‍🏫', label: 'Add New Teacher', href: '/admin/teachers', color: '#10b981' },
                                { icon: '🚪', label: 'View Entry Logs', href: '/admin/entry-logs', color: '#f59e0b' },
                                { icon: '📊', label: 'Generate Report', href: '/admin/reports', color: '#8b5cf6' },
                                { icon: '📲', label: 'Send Notification', href: '/admin/alerts', color: '#06b6d4' },
                            ].map((action, i) => (
                                <a key={i} href={action.href} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '11px 14px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    fontSize: 13, fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                    transition: 'var(--transition)',
                                    textDecoration: 'none',
                                }}>
                                    <span style={{ fontSize: 18 }}>{action.icon}</span>
                                    {action.label}
                                    <span style={{ marginLeft: 'auto', color: action.color }}>→</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
