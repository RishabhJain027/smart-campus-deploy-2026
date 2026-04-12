'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminTeachers() {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTeacher, setEditTeacher] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', department: 'Computer Science', phone: '' });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [search, setSearch] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);

    const departments = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Mathematics', 'Physics'];

    const fetchTeachers = () => {
        setLoading(true);
        fetch('/api/teachers')
            .then(res => res.json())
            .then(data => setTeachers(data.teachers || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTeachers(); }, []);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

    const handleSubmit = async () => {
        if (!form.name || !form.email || !form.department) {
            showToast('❌ Name, email, and department are required');
            return;
        }
        setSaving(true);
        try {
            const body = editTeacher
                ? { ...form, action: 'update', id: editTeacher.id }
                : form;

            const res = await fetch('/api/teachers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success || data.id) {
                showToast(editTeacher ? '✅ Teacher updated successfully!' : `✅ ${form.name} added! Default password: Test@1234`);
                setShowModal(false);
                setEditTeacher(null);
                setForm({ name: '', email: '', department: 'Computer Science', phone: '' });
                fetchTeachers();

                // Send WhatsApp notification
                if (!editTeacher && form.phone) {
                    try {
                        await fetch('/api/notifications/whatsapp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'teacher_added',
                                phone: form.phone,
                                data: { name: form.name, email: form.email, department: form.department }
                            }),
                        });
                    } catch (e) {}
                }
            } else {
                showToast('❌ ' + (data.error || 'Failed'));
            }
        } catch (err) {
            showToast('❌ Network error');
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch('/api/teachers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('✅ Teacher removed');
                setConfirmDelete(null);
                fetchTeachers();
            } else {
                showToast('❌ ' + (data.error || 'Delete failed'));
            }
        } catch (err) {
            showToast('❌ Network error');
        }
    };

    const openEdit = (t) => {
        setEditTeacher(t);
        setForm({ name: t.name, email: t.email, department: t.department, phone: t.phone || '' });
        setShowModal(true);
    };

    const openAdd = () => {
        setEditTeacher(null);
        setForm({ name: '', email: '', department: 'Computer Science', phone: '' });
        setShowModal(true);
    };

    const filtered = teachers.filter(t =>
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.email?.toLowerCase().includes(search.toLowerCase()) ||
        t.department?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <DashboardLayout title="Teachers"><div style={{padding: 20}}>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout title="Teacher Management" breadcrumb="Teachers">
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 10000,
                    padding: '14px 24px', borderRadius: 14,
                    background: toast.startsWith('✅') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${toast.startsWith('✅') ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                    color: toast.startsWith('✅') ? '#22c55e' : '#ef4444',
                    fontSize: 14, fontWeight: 600,
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    animation: 'slideIn 0.3s ease',
                }}>
                    {toast}
                </div>
            )}

            <style>{`
                @keyframes slideIn { from{transform:translateX(100px);opacity:0} to{transform:translateX(0);opacity:1} }
                @keyframes modalFadeIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
            `}</style>

            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>👨‍🏫 Teacher Management</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                        Manage faculty members — {teachers.length} total teachers
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openAdd} style={{ height: 44, fontSize: 14, padding: '0 24px' }}>
                    + Add Teacher
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
                {[
                    { label: 'Total Faculty', value: teachers.length, icon: '👨‍🏫', color: '#3b82f6' },
                    { label: 'Departments', value: [...new Set(teachers.map(t => t.department))].length, icon: '🏢', color: '#8b5cf6' },
                    { label: 'Computer Science', value: teachers.filter(t => t.department === 'Computer Science').length, icon: '💻', color: '#22d3ee' },
                    { label: 'Active', value: teachers.filter(t => t.approved !== false).length, icon: '✅', color: '#10b981' },
                ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ fontSize: 28 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    placeholder="🔍 Search teachers by name, email, or department..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', maxWidth: 400, padding: '10px 16px', fontSize: 13 }}
                />
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                        {search ? 'No teachers match your search' : 'No teachers yet. Add one!'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(t => (
                                    <tr key={t.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-cyan)' }}>{t.id}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                                                }}>
                                                    {t.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{t.name}</span>
                                            </div>
                                        </td>
                                        <td><span className="badge">{t.department}</span></td>
                                        <td style={{ fontSize: 13 }}>{t.email}</td>
                                        <td style={{ fontSize: 13 }}>{t.phone || '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '—'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}
                                                    style={{ fontSize: 12 }}>✏️ Edit</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(t.id)}
                                                    style={{ fontSize: 12, color: '#ef4444' }}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation */}
            {confirmDelete && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(5,12,30,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                }}>
                    <div className="card" style={{ maxWidth: 380, textAlign: 'center', padding: 32, animation: 'modalFadeIn 0.2s ease' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Teacher?</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
                            This action cannot be undone. The teacher will be removed from the system.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                                onClick={() => handleDelete(confirmDelete)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(5,12,30,0.9)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                }}>
                    <div className="card" style={{
                        maxWidth: 480, width: '94%', padding: 32,
                        animation: 'modalFadeIn 0.25s ease',
                        border: '1px solid rgba(59,130,246,0.2)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 800 }}>
                                {editTeacher ? '✏️ Edit Teacher' : '➕ Add New Teacher'}
                            </h2>
                            <button onClick={() => { setShowModal(false); setEditTeacher(null); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Full Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Dr. Amit Desai"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', fontSize: 14 }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Email Address *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="e.g. amit@teacher.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    disabled={!!editTeacher}
                                    style={{ width: '100%', padding: '10px 14px', fontSize: 14 }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Department *</label>
                                <select
                                    className="form-input"
                                    value={form.department}
                                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', fontSize: 14 }}
                                >
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Phone (WhatsApp)</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="e.g. +91-9876543210"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', fontSize: 14 }}
                                />
                            </div>

                            {!editTeacher && (
                                <div style={{
                                    padding: 12, borderRadius: 10,
                                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                                    fontSize: 12, color: '#60a5fa',
                                }}>
                                    🔐 Default password will be <strong>Test@1234</strong> — teacher should change it after first login.
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <button className="btn btn-outline" onClick={() => { setShowModal(false); setEditTeacher(null); }}
                                    style={{ flex: 1 }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}
                                    style={{ flex: 1 }}>
                                    {saving ? '⏳ Saving...' : editTeacher ? '💾 Update Teacher' : '➕ Add Teacher'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
