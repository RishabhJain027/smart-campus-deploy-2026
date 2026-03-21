'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const mockAttendance = [
    { subject: 'Data Structures', present: 14, total: 16, percentage: 87 },
    { subject: 'Computer Networks', present: 12, total: 15, percentage: 80 },
    { subject: 'DBMS', present: 13, total: 14, percentage: 93 },
    { subject: 'OS', present: 10, total: 15, percentage: 67 },
    { subject: 'Algorithms', present: 15, total: 16, percentage: 94 },
];

const weekData = [
    { day: 'Mon', p: 4 }, { day: 'Tue', p: 3 }, { day: 'Wed', p: 5 },
    { day: 'Thu', p: 4 }, { day: 'Fri', p: 3 },
];

const recentEntries = [
    { time: '09:02 AM', method: 'RFID', gate: 'Main Gate', status: 'success' },
    { time: 'Yesterday 08:55 AM', method: 'Face', gate: 'Main Gate', status: 'success' },
    { time: '17 Mar 09:10 AM', method: 'RFID', gate: 'Side Gate', status: 'success' },
];

export default function StudentDashboard() {
    const [attendance, setAttendance] = useState(mockAttendance);
    const [entries, setEntries] = useState(recentEntries);
    const overall = Math.round(attendance.reduce((s, a) => s + (a.percentage || 0), 0) / attendance.length);

    useEffect(() => {
        const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-IN')), 1000);
        setTime(new Date().toLocaleTimeString('en-IN'));

        if (isFirebaseConfigured && localStorage.getItem('sc_user')) {
            const user = JSON.parse(localStorage.getItem('sc_user'));
            
            // Real-time Recent Entries
            const entriesQuery = query(
                collection(db, 'entry_logs'), 
                where('student_id', '==', user.id), 
                orderBy('entry_time', 'desc'), 
                limit(5)
            );
            const unsubEntries = onSnapshot(entriesQuery, (snap) => {
                const data = snap.docs.map(doc => ({
                    time: doc.data().entry_time?.toDate().toLocaleTimeString(),
                    method: doc.data().verification_method,
                    gate: doc.data().gate_id,
                    status: 'success'
                }));
                if (data.length > 0) setEntries(data);
            });

            return () => {
                clearInterval(t);
                unsubEntries();
            };
        }

        return () => clearInterval(t);
    }, []);

    return (
        <DashboardLayout title="Student Dashboard">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <div className="avatar avatar-lg" style={{ background: 'var(--grad-blue)' }}>RJ</div>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Welcome back, Rishabh! 👋</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>CS – Semester 4 · Roll: CS2021001 · {time}</p>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                    { icon: '📊', label: 'Overall Attendance', value: `${overall}%`, color: overall >= 75 ? '#10b981' : '#f59e0b', bg: overall >= 75 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', change: overall >= 75 ? '✓ Good standing' : '⚠ Improve attendance' },
                    { icon: '✅', label: 'Today\'s Status', value: 'Present', color: '#10b981', bg: 'rgba(16,185,129,0.12)', change: 'Marked at 09:02 AM' },
                    { icon: '🚪', label: 'Entry Today', value: '09:02 AM', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', change: 'Via RFID – Main Gate' },
                    { icon: '📚', label: 'Active Subjects', value: '5', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', change: '1 lecture today' },
                ].map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize: 26 }}>{s.icon}</span></div>
                        <div className="stat-info">
                            <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.change}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid-2" style={{ marginBottom: 24, alignItems: 'start' }}>
                {/* Subject-wise attendance */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📚 Subject-wise Attendance</h3>
                    {attendance.map((s, i) => (
                        <div key={i} style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.subject}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: (s.percentage || 0) >= 75 ? '#10b981' : '#f59e0b' }}>{s.percentage || 0}%</span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className={`progress-fill ${(s.percentage || 0) >= 75 ? 'green' : 'amber'}`}
                                    style={{ width: `${s.percentage || 0}%` }}
                                />
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {s.present}/{s.total} lectures — {(s.percentage || 0) < 75 ? `⚠ Need ${Math.ceil(0.75 * s.total) - s.present} more` : '✓ On track'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right col */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Attendance score ring */}
                    <div className="card" style={{ textAlign: 'center', padding: '28px 24px' }}>
                        <div style={{
                            width: 120, height: 120,
                            borderRadius: '50%',
                            background: `conic-gradient(${overall >= 75 ? '#10b981' : '#f59e0b'} ${overall * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px',
                            position: 'relative',
                        }}>
                            <div style={{
                                width: 90, height: 90, borderRadius: '50%',
                                background: 'var(--bg-card)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column',
                            }}>
                                <div style={{ fontSize: 24, fontWeight: 900, color: overall >= 75 ? '#10b981' : '#f59e0b' }}>{overall}%</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Overall</div>
                            </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Attendance Score</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            {overall >= 75 ? '✅ Eligible for exams' : '⚠️ Below 75% threshold'}
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                            <a href="/face-attendance" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                                📷 Face Check-In
                            </a>
                        </div>
                    </div>

                    {/* Campus Entry Logs */}
                    <div className="card">
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🚪 Recent Campus Entries</h3>
                        {entries.map((e, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                    {e.method === 'RFID' ? '📡' : '📷'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.gate}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.time} · Via {e.method}</div>
                                </div>
                                <span className={`badge badge-${e.status === 'success' ? 'success' : 'danger'}`}>
                                    {e.status === 'success' ? '✓' : '✕'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Upcoming */}
            <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📅 Today's Schedule</h3>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                    {[
                        { time: '10:00 AM', subject: 'Data Structures', room: 'CS-301', teacher: 'Dr. Sharma', status: 'upcoming' },
                        { time: '11:30 AM', subject: 'Computer Networks', room: 'CS-201', teacher: 'Prof. Gupta', status: 'upcoming' },
                        { time: '02:00 PM', subject: 'DBMS Lab', room: 'Lab-2', teacher: 'Dr. Patel', status: 'upcoming' },
                    ].map((c, i) => (
                        <div key={i} style={{
                            minWidth: 200, padding: '16px', border: '1px solid var(--border)',
                            borderRadius: 12, background: 'var(--bg-card)',
                            borderTop: '3px solid var(--color-blue)',
                        }}>
                            <div style={{ fontSize: 12, color: 'var(--color-blue)', fontWeight: 700, marginBottom: 6 }}>{c.time}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{c.subject}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.room} · {c.teacher}</div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
