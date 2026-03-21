'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

const mockHealth = [
    { time: '12:00', cpu: 42, heap: 180, rssi: -65 },
    { time: '12:05', cpu: 45, heap: 175, rssi: -67 },
    { time: '12:10', cpu: 38, heap: 182, rssi: -64 },
    { time: '12:15', cpu: 55, heap: 168, rssi: -70 },
    { time: '12:20', cpu: 40, heap: 178, rssi: -66 },
];

export default function IOTCommandCenter() {
    const [status, setStatus] = useState('Online');
    const [logs, setLogs] = useState([
        { time: '12:20:45', msg: 'HEARTBEAT [ESP32-01]: OK, Heap: 182KB, RSSI: -65dBm', type: 'info' },
        { time: '12:20:42', msg: 'RFID_SCAN: Card [A7B45C] at GATE_MAIN', type: 'success' },
        { time: '12:20:43', msg: 'AUTH_SUCCESS: Student [Rishabh Jain] - ACCESS_GRANTED', type: 'success' },
    ]);

    useEffect(() => {
        if (isFirebaseConfigured) {
            const q = query(collection(db, 'entry_logs'), orderBy('entry_time', 'desc'), limit(15));
            return onSnapshot(q, (snap) => {
                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    time: doc.data().entry_time?.toDate().toLocaleTimeString(),
                    msg: `${doc.data().verification_method} ${doc.data().security_alert ? 'ALERT' : 'Access'} @ ${doc.data().gate_id}`,
                    type: doc.data().security_alert ? 'danger' : 'success'
                }));
                if (data.length > 0) setLogs(data);
            });
        }
    }, []);

    return (
        <DashboardLayout title="IoT Command Center" breadcrumb="Systems / Live Monitor">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 900, background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Hardware Pulse & Telemetry
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Real-time monitoring of ESP32 DevModules & Peripheral Sensors</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div className="badge badge-success" style={{ padding: '8px 16px', fontSize: 13 }}>
                        ● System Healthy
                    </div>
                    <button className="btn btn-outline btn-sm">Reboot Nodes</button>
                </div>
            </div>

            <div className="grid-3" style={{ marginBottom: 24, gap: 20 }}>
                {/* Device Card */}
                <div className="card-glass" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-blue)' }}>Master Gate Node</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: ESP32-MA-01</span>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>-65 dBm</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-green)' }} />
                        Strong WiFi Signal
                    </div>
                    <div className="progress-bar" style={{ marginTop: 20, height: 4 }}>
                        <div className="progress-fill" style={{ width: '85%' }} />
                    </div>
                </div>

                <div className="card-glass" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-purple)' }}>CPU Telemetry</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>40% Load</span>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>42°C</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Thermal: Within Normal Limits</div>
                    <div className="progress-bar" style={{ marginTop: 20, height: 4 }}>
                        <div className="progress-fill" style={{ width: '42%', background: 'var(--grad-purple)' }} />
                    </div>
                </div>

                <div className="card-glass" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-amber)' }}>Heap Memory</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>182 KB Free</span>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>76%</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Stability: High Reliability</div>
                    <div className="progress-bar" style={{ marginTop: 20, height: 4 }}>
                        <div className="progress-fill" style={{ width: '76%', background: 'var(--grad-amber)' }} />
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ gap: 24 }}>
                <div className="card">
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>System Stability Data</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={mockHealth}>
                            <defs>
                                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                            <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800 }}>Node Live Stream</h3>
                    </div>
                    <div style={{ height: 280, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0 24px 24px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {logs.map((log, i) => (
                            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', color: log.type === 'success' ? '#10b981' : log.type === 'danger' ? '#ef4444' : log.type === 'warning' ? '#f59e0b' : '#94a3b8' }}>
                                <span style={{ opacity: 0.5, marginRight: 10 }}>[{log.time}]</span>
                                {log.msg}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
