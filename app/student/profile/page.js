'use client';
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import QRCode from 'react-qr-code';
import BiometricsManager from '@/components/BiometricsManager';

const attendanceData = [
    { month: 'Jan', percentage: 72 },
    { month: 'Feb', percentage: 88 },
    { month: 'Mar', percentage: 81 },
    { month: 'Apr', percentage: 76 },
    { month: 'May', percentage: 84 },
];

export default function StudentProfile() {
    const [user, setUser] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploadMsg, setUploadMsg] = useState('');
    const [photoSelected, setPhotoSelected] = useState(false);
    const [isEditingSem, setIsEditingSem] = useState(false);
    const [newSem, setNewSem] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Load actual logged-in user from localStorage + refresh from API
        const authUser = localStorage.getItem('sc_user');
        if (authUser) {
            const parsed = JSON.parse(authUser);
            setUser(parsed);
            if (parsed.profile_photo) setPhotoPreview(parsed.profile_photo);

            // Fetch fresh data from backend
            fetch('/api/students')
                .then(r => r.json())
                .then(data => {
                    const me = data.students?.find(s => s.id === parsed.id);
                    if (me) {
                        setUser(me);
                        // update localStorage with fresh name
                        localStorage.setItem('sc_user', JSON.stringify({ ...parsed, ...me }));
                        if (me.profile_photo) setPhotoPreview(me.profile_photo);
                    }
                })
                .catch(() => {});
        }
    }, []);

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhotoSelected(true);
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handlePhotoUpload = async () => {
        const file = fileInputRef.current?.files[0];
        if (!file || !user) return;
        setUploading(true);
        setUploadMsg('');
        try {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('userId', user.id);

            const res = await fetch('/api/students/upload-photo', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setUploadMsg('✅ Profile photo updated!');
                setPhotoSelected(false);
                if (data.url) {
                    setPhotoPreview(data.url);
                    const stored = localStorage.getItem('sc_user');
                    if (stored) {
                        const u = JSON.parse(stored);
                        localStorage.setItem('sc_user', JSON.stringify({ ...u, profile_photo: data.url }));
                    }
                }
            } else {
                setUploadMsg('❌ ' + (data.error || 'Upload failed'));
            }
        } catch (err) {
            setUploadMsg('❌ Network error');
        }
        setUploading(false);
    };
    const handleSemUpdate = async () => {
        if (!newSem) return;
        try {
            const res = await fetch('/api/students/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, semester: newSem }),
            });
            const data = await res.json();
            if (data.success) {
                const updated = { ...user, semester: newSem };
                setUser(updated);
                localStorage.setItem('sc_user', JSON.stringify(updated));
                setIsEditingSem(false);
                setUploadMsg('✅ Semester updated!');
                setTimeout(() => setUploadMsg(''), 3000);
            }
        } catch (err) {
            setUploadMsg('❌ Failed to update');
        }
    };

    // ── Download Digital ID as image ──
    const downloadDigitalID = (u) => {
        const canvas = document.createElement('canvas');
        const W = 600, H = 360;
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Background gradient
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#1E4E6E');
        bg.addColorStop(0.6, '#3A7FA3');
        bg.addColorStop(1, '#6FAED2');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Watermark circle
        ctx.beginPath();
        ctx.arc(W + 20, -20, 140, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fill();

        // Top: institution
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 11px Arial';
        ctx.letterSpacing = '3px';
        ctx.fillText('SAKEC SMART CAMPUS', 30, 40);

        // Student badge
        ctx.fillStyle = 'rgba(230,197,106,0.15)';
        const bdgX = W - 110, bdgY = 22;
        ctx.beginPath();
        ctx.roundRect(bdgX, bdgY, 80, 24, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(230,197,106,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#e6c56a';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('STUDENT', bdgX + 12, bdgY + 16);

        // Name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(u.name, 30, 78);

        // Department
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '14px Arial';
        ctx.fillText(`${u.department} · Semester ${u.semester}`, 30, 102);

        // Divider
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.moveTo(30, 120); ctx.lineTo(W - 30, 120); ctx.stroke();

        // QR placeholder area
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(30, 140, 120, 120, 12);
        ctx.fill();

        // QR pattern simulation
        ctx.fillStyle = '#1E4E6E';
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                if (Math.random() > 0.4) {
                    ctx.fillRect(40 + i * 10, 150 + j * 10, 8, 8);
                }
            }
        }

        // Info fields
        const fields = [
            { label: 'STUDENT ID', value: u.id },
            { label: 'EMAIL', value: u.email },
            { label: 'PHONE', value: u.phone || 'N/A' },
            { label: 'RFID UID', value: u.rfid_uid || 'Not linked' },
        ];

        let y = 155;
        fields.forEach(f => {
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.font = '9px Arial';
            ctx.fillText(f.label, 180, y);
            ctx.fillStyle = '#D9F1FF';
            ctx.font = 'bold 13px Arial';
            ctx.fillText(f.value, 180, y + 16);
            y += 34;
        });

        // Bottom strip
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.moveTo(30, H - 40); ctx.lineTo(W - 30, H - 40); ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px monospace';
        ctx.fillText('Scan QR to verify identity', 30, H - 18);

        // Active dot
        ctx.fillStyle = '#7FE0FF';
        ctx.beginPath(); ctx.arc(W - 80, H - 22, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7FE0FF';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('ACTIVE', W - 70, H - 18);

        // Download
        const link = document.createElement('a');
        link.download = `${u.name.replace(/\s/g, '_')}_Digital_ID.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    if (!user) {
        return (
            <DashboardLayout title="Student Profile">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
                        <div>Loading profile...</div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

    return (
        <DashboardLayout title="Student Profile" breadcrumb="Profile / Overview">
            {/* ── Hero Banner ── */}
            <div className="card-glass" style={{ padding: 40, marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 120,
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                    opacity: 0.15
                }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* ── Avatar / Photo Upload ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: 110, height: 110, borderRadius: '50%',
                                border: '4px solid var(--bg-card)',
                                boxShadow: '0 0 40px rgba(0,0,0,0.5)',
                                cursor: 'pointer', overflow: 'hidden',
                                background: photoPreview ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 38, fontWeight: 900, color: '#fff',
                                position: 'relative', transition: 'opacity 0.2s'
                            }}
                            title="Click to change photo"
                        >
                            {photoPreview
                                ? <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : initials}
                            {/* Camera overlay on hover */}
                            <div style={{
                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 22, opacity: 0, transition: 'opacity 0.2s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0}
                            >📷</div>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            style={{ display: 'none' }}
                        />

                        {photoSelected ? (
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handlePhotoUpload}
                                disabled={uploading}
                                style={{ fontSize: 11, padding: '6px 14px' }}
                            >
                                {uploading ? '⏳ Uploading...' : '💾 Save Photo'}
                            </button>
                        ) : (
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ fontSize: 11, padding: '6px 14px' }}
                            >
                                📷 Change Photo
                            </button>
                        )}
                        {uploadMsg && (
                            <div style={{ fontSize: 11, color: uploadMsg.startsWith('✅') ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                                {uploadMsg}
                            </div>
                        )}
                    </div>

                    {/* ── Name & Info ── */}
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>{user.name}</h1>
                        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 4 }}>
                            {user.email}
                        </p>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
                            {user.department} · Semester {user.semester}
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="badge badge-blue">Student</span>
                            {isEditingSem ? (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <select 
                                        value={newSem || user.semester} 
                                        onChange={(e) => setNewSem(e.target.value)}
                                        className="form-input" 
                                        style={{ width: 100, padding: '4px 8px', fontSize: 12 }}
                                    >
                                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                    </select>
                                    <button onClick={handleSemUpdate} className="btn btn-primary btn-sm" style={{ padding: '4px 8px' }}>Save</button>
                                    <button onClick={() => setIsEditingSem(false)} className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }}>✕</button>
                                </div>
                            ) : (
                                <span className="badge badge-purple" onClick={() => { setNewSem(user.semester); setIsEditingSem(true); }} style={{ cursor: 'pointer' }}>
                                    Sem {user.semester} ✎
                                </span>
                            )}
                            <span className="badge badge-success">Active</span>
                            <span className="badge badge-cyan">{user.face_status === 'trained' ? 'Face Enrolled ✓' : 'Face Not Enrolled'}</span>
                        </div>
                    </div>

                    {/* ── Right Actions ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'right' }}>
                        <BiometricsManager userId={user.id} userName={user.name} mode="register" />
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Phone: {user.phone}</div>
                    </div>
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid-3" style={{ gap: 24, marginBottom: 24 }}>
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>Attendance Velocity</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={attendanceData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} unit="%" />
                            <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                            <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--color-aqua)' }}>📊</span> Quick Info
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { label: 'RFID UID', value: user.rfid_uid || 'Not linked', color: 'var(--color-cyan)', icon: '💳' },
                            { label: 'Wallet Balance', value: `₹${user.wallet_balance || 0}`, color: 'var(--color-green)', icon: '💰' },
                            { label: 'Face Status', value: user.face_status === 'trained' ? 'Enrolled ✓' : 'Not enrolled', color: user.face_status === 'trained' ? '#10b981' : '#f59e0b', icon: '👤' },
                            { label: 'Department', value: user.department, color: 'var(--color-sky)', icon: '🏢' },
                        ].map((info, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                                <div style={{ fontSize: 20 }}>{info.icon}</div>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{info.label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: info.color }}>{info.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Digital ID + Security Log ── */}
            <div className="grid-2" style={{ gap: 24 }}>
                <div className="card">
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--color-gold)' }}>🪪</span> Digital ID Card
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={() => downloadDigitalID(user)} style={{ fontSize: 11 }}>
                            ⬇️ Download ID
                        </button>
                    </h3>
                    {/* Premium ocean-themed ID card */}
                    <div style={{
                        borderRadius: 20, overflow: 'hidden',
                        background: 'linear-gradient(135deg, #1E4E6E 0%, #3A7FA3 60%, #6FAED2 100%)',
                        boxShadow: '0 16px 48px rgba(0,20,50,0.6), 0 0 0 1px rgba(127,224,255,0.2)',
                        position: 'relative', padding: '24px 24px 20px',
                    }}>
                        {/* Watermark circles */}
                        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
                        <div style={{ position:'absolute', bottom:-30, left:-30, width:140, height:140, borderRadius:'50%', background:'rgba(127,224,255,0.06)', pointerEvents:'none' }} />

                        {/* Top row */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                            <div>
                                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.15em', color:'rgba(255,255,255,0.55)', textTransform:'uppercase', marginBottom:4 }}>SAKEC Smart Campus</div>
                                <div style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1.2 }}>{user.name}</div>
                                <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:2 }}>{user.department} · Sem {user.semester}</div>
                            </div>
                            <div style={{ fontSize:11, fontWeight:700, color:'var(--color-gold)', background:'rgba(230,197,106,0.15)', border:'1px solid rgba(230,197,106,0.3)', padding:'4px 10px', borderRadius:20 }}>STUDENT</div>
                        </div>

                        {/* Middle: QR + Info */}
                        <div style={{ display:'flex', gap:20, alignItems:'center' }}>
                            {/* Real QR Code */}
                            <div style={{ background:'#fff', borderRadius:12, padding:10, flexShrink:0, boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
                                <QRCode
                                    value={JSON.stringify({
                                        id: user.id,
                                        name: user.name,
                                        email: user.email,
                                        rfid: user.rfid_uid || 'N/A',
                                        dept: user.department,
                                        sem: user.semester,
                                        institution: 'SAKEC',
                                        type: 'student_id'
                                    })}
                                    size={100}
                                    bgColor="#ffffff"
                                    fgColor="#1E4E6E"
                                    level="M"
                                />
                            </div>

                            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Student ID</span>
                                    <span style={{ fontSize:12, fontWeight:700, color:'#D9F1FF', fontFamily:'var(--font-mono)' }}>{user.id}</span>
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Email</span>
                                    <span style={{ fontSize:11, fontWeight:600, color:'#D9F1FF' }}>{user.email}</span>
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em' }}>RFID</span>
                                    <span style={{ fontSize:12, fontWeight:700, color:'var(--color-gold)', fontFamily:'var(--font-mono)' }}>{user.rfid_uid || '— not linked —'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom strip */}
                        <div style={{ marginTop:18, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.12)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontFamily:'var(--font-mono)' }}>
                                Scan QR to verify identity
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <div style={{ width:8, height:8, borderRadius:'50%', background:'#7FE0FF', boxShadow:'0 0 8px #7FE0FF', animation:'pulse 2s infinite' }} />
                                <span style={{ fontSize:10, fontWeight:700, color:'#7FE0FF', textTransform:'uppercase', letterSpacing:'0.1em' }}>Active</span>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="card">
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Security Log</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { gate: 'Main Entrance', time: '10:45 AM', type: 'Entry', status: 'Success' },
                            { gate: 'Library Block', time: '09:12 AM', type: 'Entry', status: 'Success' },
                        ].map((log, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{log.gate}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.time} · {log.type}</div>
                                </div>
                                <div className="badge badge-success" style={{ height: 'fit-content' }}>{log.status}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Face Training CTA */}
            <div className="card-glass" style={{ marginTop: 24, padding: 24, display: 'flex', alignItems: 'center', gap: 20, border: '1px solid rgba(59,130,246,0.2)' }}>
                <div style={{ fontSize: 48 }}>🤖</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Face Recognition AI</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {user.face_status === 'trained'
                            ? 'Your face model is trained. Re-train anytime to improve accuracy.'
                            : 'Train your face model to enable automatic attendance via the campus scanner.'}
                    </div>
                </div>
                <a href="/student/profile/face-training">
                    <button className="btn btn-primary">
                        {user.face_status === 'trained' ? '🔄 Re-train Face Model' : '🎯 Train Face Model'}
                    </button>
                </a>
            </div>
        </DashboardLayout>
    );
}
