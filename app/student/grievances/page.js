'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const MOCK_GRIEVANCES = [
    { id: 'GR-2026-001', title: 'AC not working in Lab 3', category: 'Infrastructure', status: 'resolved', date: '2026-03-28', response: 'AC unit repaired and serviced on March 30.' },
    { id: 'GR-2026-002', title: 'Library timings too short', category: 'Academics', status: 'in_progress', date: '2026-04-01', response: 'Under review by administration.' },
    { id: 'GR-2026-003', title: 'Canteen food quality issue', category: 'Canteen', status: 'pending', date: '2026-04-03', response: null },
];

const CATEGORIES = ['Infrastructure', 'Academics', 'Canteen', 'Transport', 'Hostel', 'Other'];

export default function StudentGrievances() {
    const [grievances, setGrievances] = useState(MOCK_GRIEVANCES);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', category: 'Infrastructure', description: '' });

    function handleSubmit(e) {
        e.preventDefault();
        const newGrievance = {
            id: `GR-2026-${String(grievances.length + 1).padStart(3, '0')}`,
            title: form.title,
            category: form.category,
            status: 'pending',
            date: new Date().toISOString().split('T')[0],
            response: null,
        };
        setGrievances([newGrievance, ...grievances]);
        setForm({ title: '', category: 'Infrastructure', description: '' });
        setShowForm(false);
    }

    const statusColor = { resolved: 'success', in_progress: 'warning', pending: 'danger' };
    const statusLabel = { resolved: '✓ Resolved', in_progress: '⏳ In Progress', pending: '⏱ Pending' };

    return (
        <DashboardLayout title="Grievances" breadcrumb="Student Grievances">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>📋 My Grievances</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Submit and track complaints, feedback, and requests.</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                    {showForm ? '✕ Cancel' : '+ New Grievance'}
                </button>
            </div>

            {/* New Grievance Form */}
            {showForm && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📝 Submit New Grievance</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block', color: 'var(--text-secondary)' }}>Title</label>
                            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                                placeholder="Brief subject of your grievance"
                                required style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block', color: 'var(--text-secondary)' }}>Category</label>
                            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block', color: 'var(--text-secondary)' }}>Description</label>
                            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                                placeholder="Describe the issue in detail..."
                                rows={4} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, resize: 'vertical' }} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Submit Grievance</button>
                    </form>
                </div>
            )}

            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                    { icon: '📋', label: 'Total Filed', value: grievances.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                    { icon: '⏱', label: 'Pending', value: grievances.filter(g => g.status === 'pending').length, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
                    { icon: '⏳', label: 'In Progress', value: grievances.filter(g => g.status === 'in_progress').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                    { icon: '✓', label: 'Resolved', value: grievances.filter(g => g.status === 'resolved').length, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
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

            {/* Grievance List */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '20px 24px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>📄 All Grievances</h3>
                </div>
                <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grievances.map(g => (
                                <tr key={g.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-cyan)' }}>{g.id}</td>
                                    <td style={{ fontWeight: 600, fontSize: 13 }}>{g.title}</td>
                                    <td><span className="badge">{g.category}</span></td>
                                    <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{g.date}</td>
                                    <td><span className={`badge badge-${statusColor[g.status]}`}>{statusLabel[g.status]}</span></td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {g.response || '—'}
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
