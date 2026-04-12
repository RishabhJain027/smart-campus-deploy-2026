'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function TeacherNotifications() {
    const [user, setUser] = useState(null);
    const [students, setStudents] = useState([]);
    const [showCompose, setShowCompose] = useState(false);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sendTo, setSendTo] = useState('all'); // all | department | individual
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState('');
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const authUser = localStorage.getItem('sc_user');
        if (authUser) setUser(JSON.parse(authUser));

        // Load students
        fetch('/api/students')
            .then(r => r.json())
            .then(data => setStudents(data.students || []))
            .catch(() => {});

        // Load sent history from localStorage
        const saved = localStorage.getItem('sc_notification_history');
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    const showToastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

    const handleSend = async () => {
        if (!subject || !body) {
            showToastMsg('❌ Subject and message are required');
            return;
        }

        setSending(true);

        let targetPhones = [];
        let targetNames = [];

        if (sendTo === 'all') {
            targetPhones = students.filter(s => s.phone).map(s => s.phone);
            targetNames = students.map(s => s.name);
        } else if (sendTo === 'department') {
            const deptStudents = students.filter(s => s.department === user?.department);
            targetPhones = deptStudents.filter(s => s.phone).map(s => s.phone);
            targetNames = deptStudents.map(s => s.name);
        } else {
            const selected = students.filter(s => selectedStudents.includes(s.id));
            targetPhones = selected.filter(s => s.phone).map(s => s.phone);
            targetNames = selected.map(s => s.name);
        }

        try {
            const res = await fetch('/api/notifications/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'broadcast',
                    data: {
                        senderName: user?.name || 'Teacher',
                        subject,
                        body,
                        phones: targetPhones,
                    }
                }),
            });
            const data = await res.json();

            const entry = {
                id: Date.now(),
                subject,
                body,
                sentTo: sendTo === 'all' ? 'All Students' : sendTo === 'department' ? `${user?.department} Students` : `${targetNames.length} selected`,
                count: targetPhones.length,
                sent: data.sent || targetPhones.length,
                date: new Date().toLocaleDateString('en-IN'),
                time: new Date().toLocaleTimeString('en-IN'),
                status: data.success ? 'Sent' : 'Failed',
            };

            const newHistory = [entry, ...history].slice(0, 30);
            setHistory(newHistory);
            localStorage.setItem('sc_notification_history', JSON.stringify(newHistory));

            showToastMsg(`✅ Broadcast sent to ${data.sent || targetPhones.length}/${targetPhones.length} students via WhatsApp`);
            setShowCompose(false);
            setSubject('');
            setBody('');
            setSelectedStudents([]);
        } catch (err) {
            showToastMsg('❌ Failed to send broadcast');
        }
        setSending(false);
    };

    // Quick templates
    const templates = [
        { label: '📝 Assignment Due', subject: 'Assignment Reminder', body: 'Dear students,\n\nThis is a reminder that your assignment is due tomorrow. Please ensure timely submission.\n\nBest regards.' },
        { label: '📅 Class Cancelled', subject: 'Class Cancellation Notice', body: 'Dear students,\n\nPlease note that tomorrow\'s class has been cancelled. The class will be rescheduled and you will be informed.\n\nThank you.' },
        { label: '📊 Exam Schedule', subject: 'Exam Schedule Update', body: 'Dear students,\n\nThe exam schedule has been updated. Please check the portal for the latest timetable.\n\nAll the best!' },
        { label: '⚠️ Low Attendance', subject: 'Attendance Warning', body: 'Dear student,\n\nYour attendance is below 75%. Please ensure regular attendance to avoid detention.\n\nRegards.' },
    ];

    return (
        <DashboardLayout title="Notifications" breadcrumb="Communications Center">
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 10000,
                    padding: '14px 24px', borderRadius: 14,
                    background: toast.startsWith('✅') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${toast.startsWith('✅') ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                    color: toast.startsWith('✅') ? '#22c55e' : '#ef4444',
                    fontSize: 14, fontWeight: 600,
                    backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}>
                    {toast}
                </div>
            )}

            <style>{`
                @keyframes modalFadeIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
            `}</style>

            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>📲 WhatsApp Notification Hub</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                        Send broadcast messages to students via WhatsApp (Admin: 7208416569)
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCompose(true)} style={{ height: 44, fontSize: 14, padding: '0 24px' }}>
                    📢 New Broadcast
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Sent', value: history.length, icon: '📩', color: '#3b82f6' },
                    { label: 'Students', value: students.length, icon: '🧑‍🎓', color: '#8b5cf6' },
                    { label: 'Today', value: history.filter(h => h.date === new Date().toLocaleDateString('en-IN')).length, icon: '📅', color: '#22d3ee' },
                    { label: 'Success Rate', value: history.length > 0 ? `${Math.round(history.filter(h => h.status === 'Sent').length / history.length * 100)}%` : '—', icon: '✅', color: '#10b981' },
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

            {/* Quick Send Templates */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>⚡ Quick Templates</h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {templates.map((t, i) => (
                        <button key={i} className="btn btn-outline btn-sm" onClick={() => {
                            setSubject(t.subject);
                            setBody(t.body);
                            setShowCompose(true);
                        }} style={{ fontSize: 12 }}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* History */}
            <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    📋 Broadcast History
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>{history.length} broadcasts</span>
                </h3>
                {history.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '20vh', color: 'var(--text-muted)', fontSize: 14 }}>
                        No broadcasts sent yet. Click "New Broadcast" to get started.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                        {history.map(h => (
                            <div key={h.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{h.subject}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        To: {h.sentTo} · {h.sent}/{h.count} delivered · {h.date} at {h.time}
                                    </div>
                                </div>
                                <span className={`badge ${h.status === 'Sent' ? 'badge-success' : 'badge-danger'}`}>
                                    {h.status === 'Sent' ? '✅ Sent' : '❌ Failed'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(5,12,30,0.9)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                }}>
                    <div className="card" style={{
                        maxWidth: 560, width: '94%', padding: 32,
                        animation: 'modalFadeIn 0.25s ease',
                        border: '1px solid rgba(59,130,246,0.2)',
                        maxHeight: '90vh', overflowY: 'auto',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 800 }}>📢 New WhatsApp Broadcast</h2>
                            <button onClick={() => setShowCompose(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Send To */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Send To</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {[
                                        { value: 'all', label: '🌐 All Students' },
                                        { value: 'department', label: `🏢 ${user?.department || 'My Dept'}` },
                                        { value: 'individual', label: '👤 Select' },
                                    ].map(opt => (
                                        <button key={opt.value}
                                            className={`btn ${sendTo === opt.value ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                            onClick={() => setSendTo(opt.value)}
                                            style={{ fontSize: 12 }}
                                        >{opt.label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Individual student selection */}
                            {sendTo === 'individual' && (
                                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
                                    {students.map(s => (
                                        <label key={s.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                                            cursor: 'pointer', borderRadius: 6, fontSize: 13,
                                            background: selectedStudents.includes(s.id) ? 'rgba(59,130,246,0.1)' : 'transparent',
                                        }}>
                                            <input type="checkbox"
                                                checked={selectedStudents.includes(s.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedStudents([...selectedStudents, s.id]);
                                                    else setSelectedStudents(selectedStudents.filter(id => id !== s.id));
                                                }}
                                            />
                                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.phone || 'No phone'}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Subject */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Subject *</label>
                                <input type="text" className="form-input" placeholder="e.g. Assignment Reminder"
                                    value={subject} onChange={e => setSubject(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', fontSize: 14 }}
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Message *</label>
                                <textarea className="form-input" placeholder="Type your message here..."
                                    value={body} onChange={e => setBody(e.target.value)}
                                    rows={5}
                                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, resize: 'vertical' }}
                                />
                            </div>

                            {/* Preview */}
                            {subject && body && (
                                <div style={{
                                    padding: 14, borderRadius: 12,
                                    background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)',
                                }}>
                                    <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Preview</div>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>📢 PSR Campus Broadcast</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>From: {user?.name || 'Teacher'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Subject: {subject}</div>
                                    <div style={{ fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap', color: '#fff' }}>{body.substring(0, 200)}{body.length > 200 ? '...' : ''}</div>
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <button className="btn btn-outline" onClick={() => setShowCompose(false)} style={{ flex: 1 }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSend} disabled={sending} style={{ flex: 1 }}>
                                    {sending ? '⏳ Sending...' : `📩 Send to ${sendTo === 'all' ? students.length : sendTo === 'department' ? students.filter(s => s.department === user?.department).length : selectedStudents.length} students`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
