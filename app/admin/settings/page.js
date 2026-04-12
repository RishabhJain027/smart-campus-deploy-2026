'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminSettings() {
    const [waStatus, setWaStatus] = useState(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState('');
    const [testPhone, setTestPhone] = useState('7208416569');

    useEffect(() => {
        fetch('/api/notifications/whatsapp-status')
            .then(r => r.json())
            .then(setWaStatus)
            .catch(() => {});
    }, []);

    const sendTestMessage = async () => {
        setTesting(true);
        setTestResult('');
        try {
            const res = await fetch('/api/notifications/whatsapp-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: testPhone }),
            });
            const data = await res.json();
            if (data.success) {
                setTestResult(`✅ Test message sent! Provider: ${data.provider || 'demo'}${data.note ? ` (${data.note})` : ''}`);
            } else {
                setTestResult(`❌ Failed: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            setTestResult('❌ Network error: ' + err.message);
        }
        setTesting(false);
    };

    const providerColor = waStatus?.activeProvider === 'callmebot' ? '#22c55e'
        : waStatus?.activeProvider === 'meta' ? '#3b82f6'
        : '#f59e0b';

    const providerLabel = waStatus?.activeProvider === 'callmebot' ? '✅ CallMeBot (Free)'
        : waStatus?.activeProvider === 'meta' ? '🔵 Meta Cloud API'
        : '🟡 Demo Mode (Not Configured)';

    return (
        <DashboardLayout title="System Settings" breadcrumb="Settings">
            <style>{`@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>⚙️ System Settings</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Configure global application parameters and integrations.</p>
            </div>

            {/* General Settings */}
            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏫 General Configuration</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>System Name</label>
                        <input type="text" className="form-input" defaultValue="SAKEC Autonomous Campus" style={{ width: '100%', padding: 10 }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Attendance Time Window (minutes)</label>
                        <input type="number" className="form-input" defaultValue={15} style={{ width: '100%', padding: 10 }} />
                    </div>
                    <button className="btn btn-primary" style={{ width: 'fit-content' }}>💾 Save Changes</button>
                </div>
            </div>

            {/* WhatsApp Integration */}
            <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                        📲 WhatsApp Integration
                    </h3>
                    <div style={{
                        padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                        background: `${providerColor}18`, border: `1px solid ${providerColor}40`,
                        color: providerColor,
                    }}>
                        {waStatus ? providerLabel : '⏳ Checking...'}
                    </div>
                </div>

                {/* Provider status grid */}
                {waStatus && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                        {[
                            { name: 'CallMeBot (FREE)', key: 'callmebot', configured: waStatus.providers?.callmebot, badge: '🆓 Free' },
                            { name: 'Meta Cloud API', key: 'meta', configured: waStatus.providers?.meta, badge: '💼 Business' },
                            { name: 'Local Service', key: 'local', configured: false, badge: '🖥 Local Only' },
                        ].map(p => (
                            <div key={p.key} style={{
                                padding: '14px 16px', borderRadius: 12,
                                background: p.configured ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${p.configured ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: p.configured ? '#22c55e' : 'var(--text-muted)', marginBottom: 4 }}>
                                    {p.configured ? '✅' : '⭕'} {p.name}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.badge}</div>
                                <div style={{ fontSize: 11, color: p.configured ? '#22c55e' : '#f59e0b', marginTop: 4, fontWeight: 600 }}>
                                    {p.configured ? 'Configured' : 'Not set up'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Test message */}
                <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📨 Send Test Message</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                            type="tel"
                            className="form-input"
                            placeholder="Phone number (e.g. 7208416569)"
                            value={testPhone}
                            onChange={e => setTestPhone(e.target.value)}
                            style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}
                        />
                        <button className="btn btn-primary" onClick={sendTestMessage} disabled={testing} style={{ whiteSpace: 'nowrap' }}>
                            {testing ? '⏳ Sending...' : '📩 Send Test'}
                        </button>
                    </div>
                    {testResult && (
                        <div style={{
                            marginTop: 10, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600,
                            background: testResult.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: testResult.startsWith('✅') ? '#22c55e' : '#ef4444',
                        }}>{testResult}</div>
                    )}
                </div>

                {/* Setup Guide */}
                <div style={{ padding: 20, borderRadius: 14, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#22c55e', marginBottom: 16 }}>
                        🆓 Activate Free WhatsApp (CallMeBot) — 2 Minutes Setup
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { step: '1', text: 'Open WhatsApp on your phone (7208416569)', detail: '' },
                            { step: '2', text: 'Send this exact message to +34 644 62 76 92:', detail: '"I allow callmebot to send me messages"' },
                            { step: '3', text: 'Wait ~30 seconds — you\'ll receive your API key on WhatsApp', detail: '' },
                            { step: '4', text: 'Go to Render → Your Service → Environment Variables', detail: '' },
                            { step: '5', text: 'Add: CALLMEBOT_API_KEY = <paste your key here>', detail: '' },
                            { step: '6', text: 'Click "Save Changes" → Render auto-redeploys → Done! ✅', detail: '' },
                        ].map(({ step, text, detail }) => (
                            <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                    background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 800, color: '#22c55e',
                                }}>{step}</div>
                                <div>
                                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{text}</div>
                                    {detail && (
                                        <div style={{
                                            fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700,
                                            color: '#22d3ee', padding: '4px 10px', background: 'rgba(34,211,238,0.08)',
                                            borderRadius: 6, marginTop: 4, display: 'inline-block',
                                        }}>{detail}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <a
                            href="https://dashboard.render.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ fontSize: 13 }}
                        >
                            🚀 Open Render Dashboard
                        </a>
                        <a
                            href="https://wa.me/34644627692?text=I%20allow%20callmebot%20to%20send%20me%20messages"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline"
                            style={{ fontSize: 13, color: '#22c55e', borderColor: 'rgba(34,197,94,0.4)' }}
                        >
                            💬 Open WhatsApp → CallMeBot
                        </a>
                    </div>
                </div>
            </div>

            {/* Render env instructions card */}
            <div className="card" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                    🔧 Render Environment Variables Reference
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {[
                        { key: 'CALLMEBOT_API_KEY', desc: 'Free WhatsApp API key from CallMeBot', required: true },
                        { key: 'WHATSAPP_ADMIN_PHONE', desc: 'Admin phone: 917208416569', required: false },
                        { key: 'JWT_SECRET', desc: 'Random secret for auth tokens', required: true },
                        { key: 'WHATSAPP_ACCESS_TOKEN', desc: 'Meta API token (optional, paid)', required: false },
                        { key: 'WHATSAPP_PHONE_NUMBER_ID', desc: 'Meta phone ID (optional, paid)', required: false },
                    ].map(v => (
                        <div key={v.key} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                            background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                        }}>
                            <span style={{ color: '#22d3ee', minWidth: 220 }}>{v.key}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11, flex: 1, fontFamily: 'inherit' }}>{v.desc}</span>
                            <span style={{
                                fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                                background: v.required ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.2)',
                                color: v.required ? '#ef4444' : '#94a3b8',
                            }}>{v.required ? 'REQUIRED' : 'OPTIONAL'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
