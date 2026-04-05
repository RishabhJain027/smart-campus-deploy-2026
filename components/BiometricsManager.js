'use client';
import { useState, useEffect, useRef } from 'react';

// ── Random buffer helper ───────────────────────────────────────────
function generateRandomBuffer(length) {
    const arr = new Uint8Array(length);
    window.crypto.getRandomValues(arr);
    return arr;
}

// ── SVG Fingerprint Paths (10 concentric-like ridges) ─────────────
// Each ridge is an independent SVG path so we can animate them individually
const FINGERPRINT_RIDGES = [
    // Innermost
    "M 50 50 m -2 0 a 2 3 0 1 0 4 0 a 2 3 0 1 0 -4 0",
    "M 50 50 m -5 0 a 5 7 0 1 0 10 0 a 5 7 0 1 0 -10 0",
    "M 50 50 m -9 0 a 9 12 0 1 0 18 0 a 9 12 0 1 0 -18 0",
    "M 50 50 m -14 0 a 14 18 0 1 0 28 0 a 14 18 0 1 0 -28 0",
    "M 50 50 m -19 0 a 19 24 0 1 0 38 0 a 19 24 0 1 0 -38 0",
    "M 50 50 m -24 0 a 24 30 0 1 0 48 0 a 24 30 0 1 0 -48 0",
    "M 50 50 m -29 0 a 29 36 0 1 0 58 0 a 29 36 0 1 0 -58 0",
    "M 50 50 m -34 -2 a 34 40 0 1 0 68 0 a 34 40 0 1 0 -68 0",
    "M 50 50 m -39 -4 a 39 44 0 1 0 78 0 a 39 44 0 1 0 -78 0",
    // Outermost
    "M 50 50 m -44 -6 a 44 48 0 1 0 88 0 a 44 48 0 1 0 -88 0",
];

// ── Status Badge Component ─────────────────────────────────────────
function StatusBadge({ label, ok, pending }) {
    const color = pending ? '#f59e0b' : ok ? '#22c55e' : '#ef4444';
    const icon  = pending ? '⏳' : ok ? '✓' : '✗';
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            background: `${color}15`, border: `1px solid ${color}40`,
            fontSize: 13, fontWeight: 600, color
        }}>
            <span style={{ fontSize: 16 }}>{icon}</span> {label}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────
export default function BiometricsManager({ userId, userName, mode = 'register', onSuccess, buttonText, style }) {
    const [supported,    setSupported]    = useState(false);
    const [loading,      setLoading]      = useState(false);
    const [scanProgress, setScanProgress] = useState(0);   // 0-100
    const [saveStatus,   setSaveStatus]   = useState(null); // null | object
    const [scanPhase,    setScanPhase]    = useState('idle'); // idle | scanning | saving | done | error
    const intervalRef = useRef(null);

    useEffect(() => {
        if (window.PublicKeyCredential) {
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(res => setSupported(res))
                .catch(() => setSupported(false));
        }
    }, []);

    // Animate ridge-by-ridge from 0→100 over ~1.4s
    const animateScan = () => new Promise(resolve => {
        let p = 0;
        intervalRef.current = setInterval(() => {
            p = Math.min(p + 2, 100);
            setScanProgress(p);
            if (p >= 100) {
                clearInterval(intervalRef.current);
                resolve();
            }
        }, 28); // ~1.4s total
    });

    // ── REGISTER ────────────────────────────────────────────────────
    const handleRegister = async () => {
        setLoading(true);
        setScanProgress(0);
        setSaveStatus(null);
        setScanPhase('scanning');

        await animateScan();
        setScanPhase('saving');

        try {
            const publicKey = {
                challenge: generateRandomBuffer(32),
                rp: { name: "SAKEC Campus System", id: window.location.hostname },
                user: {
                    id: generateRandomBuffer(16),
                    name: userName || "user",
                    displayName: userName || "User"
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                },
                timeout: 60000,
            };

            const credential = await navigator.credentials.create({ publicKey });

            if (credential) {
                const status = { local: false, backend: false, backendError: null };

                // 1. Save to LocalStorage
                try {
                    localStorage.setItem(`sc_fingerprint_id_${userId}`, credential.id);
                    localStorage.setItem(`sc_fingerprint_registered_at_${userId}`, new Date().toISOString());
                    status.local = true;
                } catch (e) {
                    console.warn('LocalStorage save failed:', e);
                }

                // 2. Save to Backend DB
                try {
                    const res = await fetch('/api/students/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            student_id: userId,
                            passkey_id: credential.id
                        })
                    });
                    const json = await res.json();
                    if (res.ok && json.success) {
                        status.backend = true;
                    } else {
                        status.backendError = json.error || 'Unknown error';
                    }
                } catch (e) {
                    status.backendError = e.message;
                }

                setSaveStatus(status);
                setScanPhase('done');
                if (onSuccess) onSuccess(credential);
            }
        } catch (err) {
            console.error(err);
            setScanPhase('error');
            setSaveStatus({ local: false, backend: false, backendError: 'Registration cancelled or failed' });
        }

        setLoading(false);
    };

    // ── AUTHENTICATE ─────────────────────────────────────────────────
    const handleAuthenticate = async () => {
        setLoading(true);
        setScanProgress(0);
        setSaveStatus(null);
        setScanPhase('scanning');

        await animateScan();
        setScanPhase('saving');

        try {
            const publicKey = {
                challenge: generateRandomBuffer(32),
                rpId: window.location.hostname,
                userVerification: "required",
                timeout: 60000,
            };
            const assertion = await navigator.credentials.get({ publicKey });
            if (assertion) {
                setScanPhase('done');
                if (onSuccess) onSuccess(assertion);
            }
        } catch (err) {
            console.error(err);
            setScanPhase('error');
        }

        setLoading(false);
    };

    const handleClose = () => {
        setLoading(false);
        setScanProgress(0);
        setSaveStatus(null);
        setScanPhase('idle');
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    if (!supported) return (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
            🔒 Fingerprint/Biometrics not supported on this device.
        </div>
    );

    const action = mode === 'register' ? handleRegister : handleAuthenticate;

    // How many ridges to "illuminate" based on progress
    const litRidges = Math.ceil((scanProgress / 100) * FINGERPRINT_RIDGES.length);

    return (
        <>
            {/* ── Trigger Button ─────────────────────────────── */}
            <button
                onClick={action}
                disabled={loading}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}
            >
                <span style={{ fontSize: 18 }}>
                    {mode === 'register' ? '🫆' : '🔐'}
                </span>
                {buttonText || (mode === 'register' ? 'Register Fingerprint' : 'Verify with Fingerprint')}
            </button>

            {/* ── Full-Screen Overlay Modal ──────────────────── */}
            {loading && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(5,12,30,0.92)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.25s ease'
                }}>
                    <style>{`
                        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
                        @keyframes pulseGlow {
                            0%,100% { box-shadow: 0 0 30px rgba(59,130,246,0.25); }
                            50%      { box-shadow: 0 0 60px rgba(59,130,246,0.55); }
                        }
                        @keyframes laserPulse {
                            0%,100% { opacity: 1; }
                            50%      { opacity: 0.6; }
                        }
                        @keyframes ridgeAppear {
                            from { opacity: 0; stroke-dashoffset: 200; }
                            to   { opacity: 1; stroke-dashoffset: 0; }
                        }
                        @keyframes successPop {
                            0%   { transform: scale(0.7); opacity: 0; }
                            70%  { transform: scale(1.1); }
                            100% { transform: scale(1);   opacity: 1; }
                        }
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to   { transform: rotate(360deg); }
                        }
                    `}</style>

                    <div className="card-glass" style={{
                        padding: '44px 40px',
                        maxWidth: 380, width: '90%',
                        textAlign: 'center',
                        border: '1px solid rgba(59,130,246,0.25)',
                        animation: 'pulseGlow 2s ease-in-out infinite',
                        position: 'relative'
                    }}>
                        {/* Close (only shown after done/error) */}
                        {(scanPhase === 'done' || scanPhase === 'error') && (
                            <button onClick={handleClose} style={{
                                position: 'absolute', top: 16, right: 16,
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', fontSize: 20, lineHeight: 1
                            }}>✕</button>
                        )}

                        {/* ── Phase: Scanning ──────────────────────────── */}
                        {(scanPhase === 'scanning' || scanPhase === 'saving') && (
                            <>
                                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: 'var(--color-cyan)', letterSpacing: '0.05em' }}>
                                    {mode === 'register' ? 'SCANNING FINGERPRINT' : 'VERIFYING IDENTITY'}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
                                    {scanPhase === 'saving'
                                        ? 'Match found — saving to database…'
                                        : 'Place your finger on the sensor'}
                                </div>

                                {/* ── SVG Fingerprint ────────────────────── */}
                                <div style={{ position: 'relative', margin: '0 auto 24px', width: 140, height: 160 }}>
                                    <svg
                                        viewBox="0 0 100 110"
                                        width={140} height={160}
                                        style={{ overflow: 'visible', filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.5))' }}
                                    >
                                        {/* Base (dim) ridges */}
                                        {FINGERPRINT_RIDGES.map((d, i) => (
                                            <path
                                                key={`base-${i}`}
                                                d={d}
                                                fill="none"
                                                stroke="rgba(255,255,255,0.07)"
                                                strokeWidth={1.8}
                                                strokeLinecap="round"
                                            />
                                        ))}

                                        {/* Lit ridges — animate in one by one */}
                                        {FINGERPRINT_RIDGES.slice(0, litRidges).map((d, i) => (
                                            <path
                                                key={`lit-${i}`}
                                                d={d}
                                                fill="none"
                                                stroke={i < litRidges - 1 ? '#3b82f6' : '#60a5fa'}
                                                strokeWidth={i < litRidges - 1 ? 1.8 : 2.2}
                                                strokeLinecap="round"
                                                style={{
                                                    strokeDasharray: 300,
                                                    strokeDashoffset: 0,
                                                    animation: `ridgeAppear 0.2s ease forwards`,
                                                    filter: i === litRidges - 1
                                                        ? 'drop-shadow(0 0 4px #3b82f6)'
                                                        : 'none'
                                                }}
                                            />
                                        ))}

                                        {/* Laser scan line */}
                                        {scanPhase === 'scanning' && scanProgress < 100 && (
                                            <line
                                                x1={6} y1={55 + ((scanProgress / 100) * 44) - 44}
                                                x2={94} y2={55 + ((scanProgress / 100) * 44) - 44}
                                                stroke="#60a5fa"
                                                strokeWidth={1.5}
                                                style={{
                                                    filter: 'drop-shadow(0 0 6px #3b82f6)',
                                                    animation: 'laserPulse 0.4s ease-in-out infinite'
                                                }}
                                            />
                                        )}

                                        {/* Saving spinner */}
                                        {scanPhase === 'saving' && (
                                            <circle
                                                cx={50} cy={55}
                                                r={48}
                                                fill="none"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                strokeDasharray="60 240"
                                                strokeLinecap="round"
                                                style={{ animation: 'spin 1s linear infinite', transformOrigin: '50px 55px' }}
                                            />
                                        )}
                                    </svg>
                                </div>

                                {/* Progress bar */}
                                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 6, marginBottom: 10, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${scanProgress}%`,
                                        background: 'linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa)',
                                        borderRadius: 8, transition: 'width 0.03s linear',
                                        boxShadow: '0 0 10px rgba(96,165,250,0.8)'
                                    }} />
                                </div>

                                <div style={{ fontSize: 22, fontWeight: 900, color: '#60a5fa', letterSpacing: '0.05em' }}>
                                    {scanProgress}%
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {scanProgress === 100 ? 'Ridge analysis complete' : `Reading ridge patterns… ${litRidges}/${FINGERPRINT_RIDGES.length}`}
                                </div>

                                {/* Saving spinner text */}
                                {scanPhase === 'saving' && (
                                    <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#f59e0b', fontSize: 13 }}>
                                        <div style={{ width: 14, height: 14, border: '2px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        Saving to backend…
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── Phase: Done ──────────────────────────────── */}
                        {scanPhase === 'done' && saveStatus && (
                            <div style={{ animation: 'successPop 0.4s ease forwards' }}>
                                <div style={{ fontSize: 56, marginBottom: 12 }}>
                                    {saveStatus.backend ? '✅' : saveStatus.local ? '⚠️' : '❌'}
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4, color: saveStatus.backend ? '#22c55e' : '#f59e0b' }}>
                                    {mode === 'register' ? 'Fingerprint Registered!' : 'Identity Verified!'}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
                                    Registration complete — data save summary:
                                </div>

                                {/* Save status grid */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                                    <StatusBadge label="Local Storage" ok={saveStatus.local} />
                                    <StatusBadge
                                        label={saveStatus.backend ? `Database — Saved (biometric_registered: true)` : `Database — ${saveStatus.backendError || 'Failed'}`}
                                        ok={saveStatus.backend}
                                    />
                                    <StatusBadge
                                        label={saveStatus.backend
                                            ? 'passkey_id stored in DB ✓'
                                            : 'passkey_id NOT saved to DB'}
                                        ok={saveStatus.backend}
                                    />
                                </div>

                                <button onClick={handleClose} className="btn btn-primary" style={{ marginTop: 24, width: '100%' }}>
                                    Close
                                </button>
                            </div>
                        )}

                        {/* ── Phase: Error ─────────────────────────────── */}
                        {scanPhase === 'error' && (
                            <div>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: '#ef4444' }}>
                                    Registration Failed
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                                    {saveStatus?.backendError || 'Biometric operation was cancelled or timed out.'}
                                </div>
                                <button onClick={handleClose} className="btn btn-outline" style={{ width: '100%' }}>
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
