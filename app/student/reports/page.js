'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const MOCK_REPORTS = [
    { id: 'RPT-001', title: 'Monthly Attendance Summary', type: 'Attendance', date: '2026-04-01', status: 'ready', details: 'Overall: 83.2% | Present: 124/149 lectures' },
    { id: 'RPT-002', title: 'Semester 5 Grade Report', type: 'Academics', date: '2026-03-15', status: 'ready', details: 'SGPA: 8.9 | Credits: 20 | Rank: 12/60' },
    { id: 'RPT-003', title: 'Fee Payment Receipt - Sem 6', type: 'Finance', date: '2026-02-20', status: 'ready', details: '₹85,000 paid | Transaction: TXN-20260220-9812' },
    { id: 'RPT-004', title: 'Library Usage Report', type: 'Library', date: '2026-03-30', status: 'ready', details: '15 books issued | 2 currently active' },
    { id: 'RPT-005', title: 'Campus Entry/Exit Log', type: 'Security', date: '2026-04-03', status: 'ready', details: '43 entries this month | Avg entry: 8:45 AM' },
];

export default function StudentReports() {
    const [reports] = useState(MOCK_REPORTS);
    const [filter, setFilter] = useState('all');

    const types = ['all', ...new Set(MOCK_REPORTS.map(r => r.type))];
    const filtered = filter === 'all' ? reports : reports.filter(r => r.type === filter);

    const typeIcon = (type) => {
        const icons = { Attendance: '📊', Academics: '🎓', Finance: '💰', Library: '📚', Security: '🔐' };
        return icons[type] || '📄';
    };

    return (
        <DashboardLayout title="My Reports" breadcrumb="Reports & Documents">
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>📈 My Reports</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Access attendance reports, grade sheets, fee receipts, and other documents.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                    { icon: '📄', label: 'Total Reports', value: reports.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                    { icon: '📊', label: 'Attendance', value: reports.filter(r => r.type === 'Attendance').length, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                    { icon: '🎓', label: 'Academic', value: reports.filter(r => r.type === 'Academics').length, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
                    { icon: '💰', label: 'Financial', value: reports.filter(r => r.type === 'Finance').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
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

            {/* Filter + Reports */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>📋 Available Reports</h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {types.map(t => (
                            <button key={t} onClick={() => setFilter(t)}
                                className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-ghost'}`}>
                                {t === 'all' ? 'All' : t}
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.map((r, i) => (
                    <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '16px 24px',
                        borderTop: '1px solid var(--border)',
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 10,
                            background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22, flexShrink: 0,
                        }}>
                            {typeIcon(r.type)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{r.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{r.details}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                <span className="badge" style={{ fontSize: 10 }}>{r.type}</span>
                                <span style={{ marginLeft: 8 }}>Generated: {r.date}</span>
                            </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" title="Download Report">
                            📥 Download
                        </button>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
}
