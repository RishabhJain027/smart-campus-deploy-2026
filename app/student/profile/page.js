'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const attendanceData = [
    { month: 'Jan', rate: 85 },
    { month: 'Feb', rate: 92 },
    { month: 'Mar', rate: 88 },
    { month: 'Apr', rate: 95 },
    { month: 'May', rate: 91 },
];

export default function StudentProfile() {
    const [user, setUser] = useState({ name: 'Rishabh Jain', roll: 'CS2021001', dept: 'Computer Science', year: '3rd Year' });

    return (
        <DashboardLayout title="Student Profile" breadcrumb="Profile / Overview">
            <div className="card-glass" style={{ padding: 40, marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 120,
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                    opacity: 0.15
                }} />
                
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 32, alignItems: 'center' }}>
                    <div className="avatar-xl" style={{ border: '4px solid var(--bg-card)', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>{user.name}</h1>
                        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 12 }}>{user.roll} · {user.dept}</p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div className="badge badge-blue">Student</div>
                            <div className="badge badge-purple">{user.year}</div>
                            <div className="badge badge-success">Active</div>
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <button className="btn btn-primary btn-sm" style={{ marginBottom: 10 }}>Edit Profile</button>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last Scan: Today, 10:45 AM</div>
                    </div>
                </div>
            </div>

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
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Quick Info</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { label: 'RFID UID', value: 'A7B45C', color: 'var(--color-cyan)' },
                            { label: 'Overall Attendance', value: '91.4%', color: 'var(--color-green)' },
                            { label: 'Absence Strikes', value: '0', color: 'var(--color-blue)' },
                            { label: 'Verified Face', value: 'Yes', color: 'var(--color-purple)' },
                        ].map((info, i) => (
                            <div key={i}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{info.label}</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: info.color }}>{info.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ gap: 24 }}>
                <div className="card">
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Digital ID Card</h3>
                    <div className="card-glass" style={{
                        padding: 30, background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
                        display: 'flex', gap: 24, alignItems: 'center'
                    }}>
                        <div style={{ width: 100, height: 100, background: '#fff', borderRadius: 12, padding: 8 }}>
                            {/* QR Placeholder */}
                            <div style={{ width: '100%', height: '100%', border: '4px solid #000', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', background: '#000' }} />
                                <div style={{ position: 'absolute', top: '40%', left: '40%', right: '40%', bottom: '40%', background: '#fff' }} />
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>PSR Digital ID</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Verified Smart Campus Identity</div>
                            <button className="btn btn-outline btn-sm">Download Wallet Pass</button>
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
        </DashboardLayout>
    );
}
