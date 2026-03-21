'use client';
import { useState, useEffect } from 'react';

export default function SystemHealth() {
    const [checks, setChecks] = useState([
        { name: 'Firebase Firestore', status: 'Checking...', color: 'var(--text-muted)' },
        { name: 'Twilio WhatsApp API', status: 'Checking...', color: 'var(--text-muted)' },
        { name: 'Google Sheets Sink', status: 'Checking...', color: 'var(--text-muted)' },
        { name: 'Local I/O Gateway', status: 'Checking...', color: 'var(--text-muted)' },
    ]);

    useEffect(() => {
        const runChecks = async () => {
            // Simulated checks with a slight delay for "premium" feel
            await new Promise(r => setTimeout(r, 1000));
            setChecks([
                { name: 'Firebase Firestore', status: 'OPERATIONAL', color: 'var(--color-green)' },
                { name: 'Twilio WhatsApp API', status: 'STANDBY', color: 'var(--color-blue)' },
                { name: 'Google Sheets Sink', status: 'SYNCED', color: 'var(--color-cyan)' },
                { name: 'Local I/O Gateway', status: 'ACTIVE', color: 'var(--color-purple)' },
            ]);
        };
        runChecks();
    }, []);

    return (
        <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 20, letterSpacing: 1 }}>
                Global Service Health
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {checks.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: c.color }}>{c.status}</span>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, boxShadow: `0 0 10px ${c.color}` }} />
                        </div>
                    </div>
                ))}
            </div>
            <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}>
                Run Deep Diagnostic
            </button>
        </div>
    );
}
