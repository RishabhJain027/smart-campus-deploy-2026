'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminStudents() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editStudent, setEdit] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', department: 'Computer Science', semester: '4', phone: '', rfid_uid: '' });
    const [toast, setToast] = useState('');
    const [saving, setSaving] = useState(false);

    const showToastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

    const fetchStudents = () => {
        setLoading(true);
        fetch('/api/students')
            .then(r => r.json())
            .then(data => setStudents(data.students || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchStudents(); }, []);

    const filtered = students.filter(s =>
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.department || '').toLowerCase().includes(search.toLowerCase())
    );

    function openAdd() {
        setForm({ name: '', email: '', department: 'Computer Science', semester: '4', phone: '', rfid_uid: '' });
        setEdit(null);
        setShowModal(true);
    }
    function openEdit(s) {
        setForm({ name: s.name, email: s.email, department: s.department || '', semester: s.semester || '', phone: s.phone || '', rfid_uid: s.rfid_uid || '' });
        setEdit(s);
        setShowModal(true);
    }

    async function saveStudent() {
        setSaving(true);
        try {
            if (editStudent) {
                const res = await fetch('/api/students/update-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: editStudent.id, ...form }),
                });
                const data = await res.json();
                if (data.success) { showToastMsg('✅ Student updated!'); fetchStudents(); }
                else showToastMsg('❌ ' + (data.error || 'Update failed'));
            } else {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...form, role: 'student', password: 'Test@1234' }),
                });
                const data = await res.json();
                if (data.success || data.id) { showToastMsg('✅ Student added! Default password: Test@1234'); fetchStudents(); }
                else showToastMsg('❌ ' + (data.error || 'Add failed'));
            }
        } catch { showToastMsg('❌ Network error'); }
        setSaving(false);
        setShowModal(false);
    }

    async function deleteStudent(id) {
        if (!confirm('Remove this student from the system?')) return;
        showToastMsg('⚠️ Delete not supported on JSON store — use localDB admin tools.');
    }

    async function sendLowAttendanceAlert(student) {
        if (!student.phone) { showToastMsg('❌ No phone number for ' + student.name); return; }
        try {
            const res = await fetch('/api/notifications/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'custom',
                    phone: student.phone,
                    data: { message: `⚠️ *PSR Campus Attendance Alert*\n\nDear *${student.name}*,\n\nYour attendance is critically low. Please attend classes regularly to avoid detention.\n\nFor queries, contact the college office.\n\n_PSR Campus System_` }
                }),
            });
            const data = await res.json();
            showToastMsg(data.success ? `✅ Alert sent to ${student.name}` : '❌ Failed to send');
        } catch { showToastMsg('❌ Network error'); }
    }

    function exportCSV() {
        const rows = [['ID', 'Name', 'Department', 'Semester', 'Email', 'Phone', 'RFID', 'Wallet Balance', 'Face Status']];
        students.forEach(s => rows.push([s.id, s.name, s.department, s.semester, s.email, s.phone || '', s.rfid_uid || '', s.wallet_balance || 0, s.face_status || '']));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'students_psr.csv'; a.click();
    }

    if (loading) return <DashboardLayout title="Students"><div style={{ padding: 30 }}>Loading students...</div></DashboardLayout>;

    return (
        <DashboardLayout title="Admin" breadcrumb="Students">
            <style>{`@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 10000,
                    padding: '14px 24px', borderRadius: 14,
                    background: toast.startsWith('✅') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${toast.startsWith('✅') ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.3)'}`,
                    color: toast.startsWith('✅') ? '#22c55e' : '#f59e0b',
                    fontSize: 14, fontWeight: 600, backdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'slideIn 0.3s ease',
                }}>{toast}</div>
            )}

            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1>🧑‍🎓 Manage Students</h1>
                    <p>{students.length} students · {students.filter(s => s.rfid_uid).length} with RFID · {students.filter(s => s.face_status === 'trained').length} with Face ID</p>
                </div>
                <div className="page-header-right">
                    <button className="btn btn-ghost btn-sm" onClick={exportCSV}>📥 Export CSV</button>
                    <button className="btn btn-primary" onClick={openAdd}>➕ Add Student</button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: 20 }}>
                {[
                    { label: 'Total', value: students.length, color: '#3b82f6', icon: '🧑‍🎓' },
                    { label: 'RFID Assigned', value: students.filter(s => s.rfid_uid).length, color: '#06b6d4', icon: '💳' },
                    { label: 'Face Registered', value: students.filter(s => s.face_status === 'trained').length, color: '#10b981', icon: '👤' },
                    { label: 'Total Wallet (₹)', value: students.reduce((sum, s) => sum + (s.wallet_balance || 0), 0).toLocaleString(), color: '#f59e0b', icon: '💰' },
                ].map((s, i) => (
                    <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
                        <div style={{ fontSize: 28 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="search-bar" style={{ marginBottom: 16 }}>
                <span>🔍</span>
                <input placeholder="Search by name, email, or department..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Table */}
            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>ID</th>
                            <th>Dept / Sem</th>
                            <th>RFID</th>
                            <th>Face ID</th>
                            <th>Wallet</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No students found</td></tr>
                        ) : filtered.map(s => (
                            <tr key={s.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                            background: s.profile_photo ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden',
                                        }}>
                                            {s.profile_photo ? <img src={s.profile_photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-cyan)' }}>{s.id}</span></td>
                                <td>{s.department} · Sem {s.semester}</td>
                                <td>
                                    {s.rfid_uid
                                        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-cyan)' }}>{s.rfid_uid}</span>
                                        : <span className="badge badge-warning">⚠ Not linked</span>
                                    }
                                </td>
                                <td>
                                    <span className={`badge badge-${s.face_status === 'trained' ? 'success' : 'danger'}`}>
                                        {s.face_status === 'trained' ? '✓ Enrolled' : '✕ None'}
                                    </span>
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>
                                    ₹{(s.wallet_balance || 0).toLocaleString()}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} title="Edit">✏️</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => sendLowAttendanceAlert(s)} title="Send WhatsApp Alert" style={{ color: '#22c55e' }}>📲</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editStudent ? '✏️ Edit Student' : '➕ Add New Student'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div className="grid-2" style={{ gap: 12 }}>
                            {[
                                ['Full Name', 'name', 'text'],
                                ['Email', 'email', 'email'],
                                ['Department', 'department', 'text'],
                                ['Semester', 'semester', 'number'],
                                ['Phone (WhatsApp)', 'phone', 'tel'],
                                ['RFID UID', 'rfid_uid', 'text'],
                            ].map(([label, field, type]) => (
                                <div key={field} className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">{label}</label>
                                    <input className="form-input" type={type} value={form[field] || ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} placeholder={label} />
                                </div>
                            ))}
                        </div>
                        {!editStudent && (
                            <div style={{ marginTop: 12, padding: 10, background: 'rgba(59,130,246,0.08)', borderRadius: 8, fontSize: 12, color: '#60a5fa' }}>
                                🔐 Default password: <strong>Test@1234</strong>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveStudent} disabled={saving}>
                                {saving ? '⏳ Saving...' : editStudent ? '💾 Update' : '➕ Add Student'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
