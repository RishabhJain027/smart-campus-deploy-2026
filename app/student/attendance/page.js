'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const MOCK_SUBJECTS = [
    { subject: 'Data Structures', code: 'CS301', present: 28, total: 32, percentage: 87.5 },
    { subject: 'Operating Systems', code: 'CS302', present: 24, total: 30, percentage: 80 },
    { subject: 'Computer Networks', code: 'CS303', present: 20, total: 28, percentage: 71.4 },
    { subject: 'Database Systems', code: 'CS304', present: 30, total: 34, percentage: 88.2 },
    { subject: 'Software Engineering', code: 'CS305', present: 22, total: 26, percentage: 84.6 },
];

const MOCK_RECORDS = [
    { date: '2026-04-05', subject: 'Data Structures', status: 'present', time: '09:15 AM', method: 'Face' },
    { date: '2026-04-05', subject: 'Operating Systems', status: 'present', time: '10:30 AM', method: 'RFID' },
    { date: '2026-04-04', subject: 'Computer Networks', status: 'absent', time: '-', method: '-' },
    { date: '2026-04-04', subject: 'Database Systems', status: 'present', time: '01:15 PM', method: 'Face' },
    { date: '2026-04-03', subject: 'Software Engineering', status: 'present', time: '11:00 AM', method: 'RFID' },
    { date: '2026-04-03', subject: 'Data Structures', status: 'present', time: '09:10 AM', method: 'Face' },
    { date: '2026-04-02', subject: 'Operating Systems', status: 'present', time: '10:25 AM', method: 'RFID' },
    { date: '2026-04-02', subject: 'Computer Networks', status: 'present', time: '02:00 PM', method: 'Face' },
    { date: '2026-04-01', subject: 'Database Systems', status: 'absent', time: '-', method: '-' },
    { date: '2026-04-01', subject: 'Software Engineering', status: 'present', time: '11:05 AM', method: 'RFID' },
];

export default function StudentAttendance() {
    const [user, setUser] = useState(null);
    const [summary, setSummary] = useState(MOCK_SUBJECTS);
    const [records, setRecords] = useState(MOCK_RECORDS);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const authUser = localStorage.getItem('sc_user');
        if (authUser) {
            const parsed = JSON.parse(authUser);
            setUser(parsed);
            // Try fetching real data
            fetch(`/api/attendance?student_id=${parsed.id}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data?.summary?.length > 0) setSummary(data.summary);
                    if (data?.records?.length > 0) setRecords(data.records);
                })
                .catch(() => {});
        }
    }, []);

    const overall = summary.length > 0
        ? Math.round(summary.reduce((s, a) => s + (a.percentage || 0), 0) / summary.length)
        : 0;

    const filtered = filter === 'all' ? records : records.filter(r => r.status === filter);

    return (
        <DashboardLayout title="My Attendance" breadcrumb="Attendance Records">
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>✅ My Attendance</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Track your lecture-by-lecture attendance across all subjects.</p>
            </div>

            {/* Overall Stats */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                    { icon: '📊', label: 'Overall', value: `${overall}%`, color: overall >= 75 ? '#10b981' : '#f59e0b', bg: overall >= 75 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' },
                    { icon: '📚', label: 'Subjects', value: summary.length.toString(), color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                    { icon: '✅', label: 'Total Present', value: summary.reduce((s, a) => s + a.present, 0).toString(), color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                    { icon: '✕', label: 'Total Absent', value: summary.reduce((s, a) => s + (a.total - a.present), 0).toString(), color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
                ].map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize: 26 }}>{s.icon}</span></div>
                        <div className="stat-info">
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid-2" style={{ alignItems: 'start', marginBottom: 24 }}>
                {/* Subject Breakdown */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📚 Subject-wise Breakdown</h3>
                    {summary.map((s, i) => (
                        <div key={i} style={{ marginBottom: 18 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.subject}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{s.code}</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: s.percentage >= 75 ? '#10b981' : '#f59e0b' }}>
                                    {Math.round(s.percentage)}%
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div className={`progress-fill ${s.percentage >= 75 ? 'green' : 'amber'}`} style={{ width: `${s.percentage}%` }} />
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {s.present}/{s.total} lectures — {s.percentage < 75 ? `⚠ Need ${Math.ceil(0.75 * s.total) - s.present} more` : '✓ On track'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Attendance Ring */}
                <div className="card" style={{ textAlign: 'center', padding: '28px 24px' }}>
                    <div style={{
                        width: 160, height: 160,
                        borderRadius: '50%',
                        background: `conic-gradient(${overall >= 75 ? '#10b981' : '#f59e0b'} ${overall * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <div style={{
                            width: 120, height: 120, borderRadius: '50%',
                            background: 'var(--bg-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'column',
                        }}>
                            <div style={{ fontSize: 32, fontWeight: 900, color: overall >= 75 ? '#10b981' : '#f59e0b' }}>{overall}%</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Overall</div>
                        </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Attendance Score</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                        {overall >= 75 ? '✅ Eligible for exams' : '⚠️ Below 75% threshold — attendance required'}
                    </div>
                    <a href="/face-attendance" className="btn btn-primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}>
                        📷 Quick Face Check-In
                    </a>
                </div>
            </div>

            {/* Recent Records Table */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>📋 Recent Attendance Records</h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {['all', 'present', 'absent'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Subject</th>
                                <th>Status</th>
                                <th>Time</th>
                                <th>Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.date}</td>
                                    <td style={{ fontWeight: 600 }}>{r.subject}</td>
                                    <td>
                                        <span className={`badge badge-${r.status === 'present' ? 'success' : 'danger'}`}>
                                            {r.status === 'present' ? '✓ Present' : '✕ Absent'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 13 }}>{r.time}</td>
                                    <td>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {r.method === 'Face' ? '📷' : r.method === 'RFID' ? '📡' : '—'} {r.method}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
