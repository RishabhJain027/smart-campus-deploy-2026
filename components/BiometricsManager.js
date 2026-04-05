'use client';
import { useState, useEffect, useRef } from 'react';

// ── Helpers ───────────────────────────────────────────────────────
function generateRandomBuffer(length) {
    const arr = new Uint8Array(length);
    window.crypto.getRandomValues(arr);
    return arr;
}

// Stable user.id from userId string (same userId → same bytes every time)
function userIdToBuffer(userId) {
    return new TextEncoder().encode(userId);
}

// base64url string → ArrayBuffer (needed for allowCredentials id)
function base64URLToBuffer(base64url) {
    try {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
        const binary = atob(padded);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
        return buffer.buffer;
    } catch { return null; }
}

// ── SVG Fingerprint Ridges ────────────────────────────────────────
const FINGERPRINT_RIDGES = [
    "M 50 50 m -2 0 a 2 3 0 1 0 4 0 a 2 3 0 1 0 -4 0",
    "M 50 50 m -5 0 a 5 7 0 1 0 10 0 a 5 7 0 1 0 -10 0",
    "M 50 50 m -9 0 a 9 12 0 1 0 18 0 a 9 12 0 1 0 -18 0",
    "M 50 50 m -14 0 a 14 18 0 1 0 28 0 a 14 18 0 1 0 -28 0",
    "M 50 50 m -19 0 a 19 24 0 1 0 38 0 a 19 24 0 1 0 -38 0",
    "M 50 50 m -24 0 a 24 30 0 1 0 48 0 a 24 30 0 1 0 -48 0",
    "M 50 50 m -29 0 a 29 36 0 1 0 58 0 a 29 36 0 1 0 -58 0",
    "M 50 50 m -34 -2 a 34 40 0 1 0 68 0 a 34 40 0 1 0 -68 0",
    "M 50 50 m -39 -4 a 39 44 0 1 0 78 0 a 39 44 0 1 0 -78 0",
    "M 50 50 m -44 -6 a 44 48 0 1 0 88 0 a 44 48 0 1 0 -88 0",
];

// ── Status Badge ──────────────────────────────────────────────────
function StatusBadge({ label, ok }) {
    const color = ok ? '#22c55e' : '#ef4444';
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            background: `${color}18`, border: `1px solid ${color}40`,
            fontSize: 13, fontWeight: 600, color, textAlign: 'left'
        }}>
            <span>{ok ? '✓' : '✗'}</span> {label}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────
export default function BiometricsManager({ userId, userName, mode = 'register', onSuccess, buttonText, style }) {
    const [supported,    setSupported]    = useState(false);
    const [loading,      setLoading]      = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [saveStatus,   setSaveStatus]   = useState(null);
    const [scanPhase,    setScanPhase]    = useState('idle');
    const intervalRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(res => setSupported(res))
                .catch(() => setSupported(false));
        }
    }, []);

    // Ridge-by-ridge animation (~1.4s)
    const animateScan = () => new Promise(resolve => {
        let p = 0;
        intervalRef.current = setInterval(() => {
            p = Math.min(p + 2, 100);
            setScanProgress(p);
            if (p >= 100) { clearInterval(intervalRef.current); resolve(); }
        }, 28);
    });

    // ── REGISTER (Save mobile fingerprint to DB) ──────────────────
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
                rp: {
                    name: "SAKEC Campus System",
                    id: window.location.hostname   // must match domain exactly
                },
                user: {
                    id: userIdToBuffer(userId),    // ✅ STABLE - same bytes every time
                    name: userName || userId,
                    displayName: userName || userId
                },
                pubKeyCredParams: [
                    { type: "public-key", alg: -7  },  // ES256
                    { type: "public-key", alg: -257 }, // RS256 (wider device support)
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",  // ✅ Forces built-in fingerprint/face
                    userVerification: "required",          // ✅ Forces biometric (not just PIN)
                    residentKey: "preferred",              // ✅ Better mobile compatibility
                    requireResidentKey: false,
                },
                timeout: 120000,
                // Exclude already registered credentials so the OS doesn't complain
                excludeCredentials: (() => {
                    const existing = localStorage.getItem(`sc_fingerprint_id_${userId}`);
                    if (!existing) return [];
                    const buf = base64URLToBuffer(existing);
                    return buf ? [{ id: buf, type: 'public-key', transports: ['internal'] }] : [];
                })(),
            };

            // ← This triggers your mobile fingerprint/face ID OS prompt
            const credential = await navigator.credentials.create({ publicKey });

            if (credential) {
                const status = { local: false, backend: false, backendError: null };

                // 1️⃣ Save credential.id to LocalStorage
                try {
                    localStorage.setItem(`sc_fingerprint_id_${userId}`, credential.id);
                    localStorage.setItem(`sc_fp_registered_at_${userId}`, new Date().toISOString());
                    status.local = true;
                } catch (e) { console.warn('LocalStorage save failed:', e); }

                // 2️⃣ Save to Backend DB
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
                    status.backend = res.ok && json.success;
                    if (!status.backend) status.backendError = json.error || 'Save failed';
                } catch (e) {
                    status.backendError = e.message;
                }

                setSaveStatus(status);
                setScanPhase('done');
                if (onSuccess) onSuccess(credential);
            }
        } catch (err) {
            console.error('Registration error:', err);
            setScanPhase('error');
            setSaveStatus({
                local: false, backend: false,
                backendError: err.name === 'NotAllowedError'
                    ? 'Fingerprint permission denied or timed out'
                    : err.message
            });
        }
        setLoading(false);
    };

    // ── AUTHENTICATE (Fetch using stored fingerprint) ─────────────
    const handleAuthenticate = async () => {
        setLoading(true);
        setScanProgress(0);
        setSaveStatus(null);
        setScanPhase('scanning');

        await animateScan();
        setScanPhase('saving');

        try {
            // ✅ Build allowCredentials with stored credential ID
            // Without this, browser shows a generic picker instead of fingerprint prompt
            const storedId = localStorage.getItem(`sc_fingerprint_id_${userId}`);
            const credBuf  = storedId ? base64URLToBuffer(storedId) : null;

            const publicKey = {
                challenge: generateRandomBuffer(32),
                rpId: window.location.hostname,
                userVerification: "required",
                timeout: 120000,
                // ✅ Tell the device EXACTLY which credential to use → triggers fingerprint directly
                allowCredentials: credBuf
                    ? [{ id: credBuf, type: 'public-key', transports: ['internal'] }]
                    : [],
            };

            const assertion = await navigator.credentials.get({ publicKey });

            if (assertion) {
                setScanPhase('done');
                setSaveStatus({ local: true, backend: true });
                if (onSuccess) onSuccess(assertion);
            }
        } catch (err) {
            console.error('Auth error:', err);
            setScanPhase('error');
            setSaveStatus({
                local: false, backend: false,
                backendError: err.name === 'NotAllowedError'
                    ? 'Fingerprint denied or timed out — make sure you registered first'
                    : err.message
            });
        }
        setLoading(false);
    };

    const handleClose = () => {
        setLoading(false); setScanProgress(0); setSaveStatus(null); setScanPhase('idle');
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    if (!supported) return (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
            🔒 Biometrics not supported on this device/browser.
        </div>
    );

    const action = mode === 'register' ? handleRegister : handleAuthenticate;
    const litRidges = Math.ceil((scanProgress / 100) * FINGERPRINT_RIDGES.length);

    return (
        <>
            {/* ── Button ─────────────────────────────────────────── */}
            <button
                onClick={action}
                disabled={loading}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}
            >
                <span style={{ fontSize: 18 }}>{mode === 'register' ? '🫆' : '🔐'}</span>
                {buttonText || (mode === 'register' ? 'Register Fingerprint' : 'Verify Fingerprint')}
            </button>

            {/* ── Overlay Modal ──────────────────────────────────── */}
            {loading && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(5,12,30,0.93)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, animation: 'biofadeIn 0.25s ease'
                }}>
                    <style>{`
                        @keyframes biofadeIn { from{opacity:0} to{opacity:1} }
                        @keyframes bioGlow { 0%,100%{box-shadow:0 0 30px rgba(59,130,246,0.2)} 50%{box-shadow:0 0 60px rgba(59,130,246,0.5)} }
                        @keyframes bioSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                        @keyframes bioPop { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
                        @keyframes bioLaser { 0%,100%{opacity:1} 50%{opacity:0.5} }
                    `}</style>

                    <div className="card-glass" style={{
                        padding: '44px 40px', maxWidth: 380, width: '90%',
                        textAlign: 'center',
                        border: '1px solid rgba(59,130,246,0.25)',
                        animation: 'bioGlow 2s ease-in-out infinite',
                        position: 'relative'
                    }}>
                        {(scanPhase === 'done' || scanPhase === 'error') && (
                            <button onClick={handleClose} style={{
                                position: 'absolute', top: 16, right: 16,
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', fontSize: 20
                            }}>✕</button>
                        )}

                        {/* Scanning / Saving */}
                        {(scanPhase === 'scanning' || scanPhase === 'saving') && (<>
                            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: 'var(--color-cyan)', letterSpacing: '0.05em' }}>
                                {mode === 'register' ? 'SCANNING FINGERPRINT' : 'VERIFYING IDENTITY'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
                                {scanPhase === 'saving'
                                    ? 'Match found — your device biometric prompt will appear…'
                                    : mode === 'register'
                                        ? 'Preparing… your mobile fingerprint prompt will appear next'
                                        : 'Preparing… touch your fingerprint sensor when prompted'}
                            </div>

                            {/* SVG Fingerprint */}
                            <div style={{ margin: '0 auto 24px', width: 140, height: 160 }}>
                                <svg viewBox="0 0 100 110" width={140} height={160}
                                    style={{ overflow: 'visible', filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.5))' }}>
                                    {FINGERPRINT_RIDGES.map((d, i) => (
                                        <path key={`b${i}`} d={d} fill="none"
                                            stroke="rgba(255,255,255,0.07)" strokeWidth={1.8} strokeLinecap="round" />
                                    ))}
                                    {FINGERPRINT_RIDGES.slice(0, litRidges).map((d, i) => (
                                        <path key={`l${i}`} d={d} fill="none"
                                            stroke={i < litRidges - 1 ? '#3b82f6' : '#60a5fa'}
                                            strokeWidth={i < litRidges - 1 ? 1.8 : 2.4}
                                            strokeLinecap="round"
                                            style={{ filter: i === litRidges-1 ? 'drop-shadow(0 0 4px #3b82f6)' : 'none' }} />
                                    ))}
                                    {scanPhase === 'scanning' && scanProgress < 100 && (
                                        <line x1={6} y1={55+((scanProgress/100)*44)-44}
                                            x2={94} y2={55+((scanProgress/100)*44)-44}
                                            stroke="#60a5fa" strokeWidth={1.5}
                                            style={{ filter: 'drop-shadow(0 0 6px #3b82f6)', animation: 'bioLaser 0.4s ease-in-out infinite' }} />
                                    )}
                                    {scanPhase === 'saving' && (
                                        <circle cx={50} cy={55} r={48} fill="none" stroke="#3b82f6"
                                            strokeWidth={2} strokeDasharray="60 240" strokeLinecap="round"
                                            style={{ animation: 'bioSpin 1s linear infinite', transformOrigin: '50px 55px' }} />
                                    )}
                                </svg>
                            </div>

                            {/* Progress bar */}
                            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 6, marginBottom: 10, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${scanProgress}%`,
                                    background: 'linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)',
                                    borderRadius: 8, transition: 'width 0.03s linear',
                                    boxShadow: '0 0 10px rgba(96,165,250,0.8)'
                                }} />
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: '#60a5fa' }}>{scanProgress}%</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {scanProgress < 100
                                    ? `Reading ridge patterns… ${litRidges}/${FINGERPRINT_RIDGES.length}`
                                    : '👆 Touch your fingerprint sensor now'}
                            </div>
                            {scanPhase === 'saving' && (
                                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#f59e0b', fontSize: 13 }}>
                                    <div style={{ width: 13, height: 13, border: '2px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'bioSpin 0.8s linear infinite' }} />
                                    Waiting for device biometric…
                                </div>
                            )}
                        </>)}

                        {/* Done */}
                        {scanPhase === 'done' && saveStatus && (
                            <div style={{ animation: 'bioPop 0.4s ease forwards' }}>
                                <div style={{ fontSize: 52, marginBottom: 12 }}>
                                    {saveStatus.backend ? '✅' : saveStatus.local ? '⚠️' : '❌'}
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4, color: saveStatus.backend ? '#22c55e' : '#f59e0b' }}>
                                    {mode === 'register' ? 'Fingerprint Registered!' : 'Identity Verified!'}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                                    {mode === 'register' ? 'Data saved to:' : 'Verification result:'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <StatusBadge label="Local Storage (device)" ok={saveStatus.local} />
                                    <StatusBadge
                                        label={saveStatus.backend
                                            ? 'Backend DB — passkey_id saved ✓'
                                            : `Backend DB — ${saveStatus.backendError || 'failed'}`}
                                        ok={saveStatus.backend}
                                    />
                                    {mode === 'register' && (
                                        <StatusBadge
                                            label={saveStatus.backend
                                                ? 'biometric_registered: true in DB ✓'
                                                : 'biometric_registered: not saved'}
                                            ok={saveStatus.backend}
                                        />
                                    )}
                                </div>
                                <button onClick={handleClose} className="btn btn-primary" style={{ marginTop: 24, width: '100%' }}>
                                    Done
                                </button>
                            </div>
                        )}

                        {/* Error */}
                        {scanPhase === 'error' && (
                            <div>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: '#ef4444' }}>
                                    {mode === 'register' ? 'Registration Failed' : 'Verification Failed'}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                                    {saveStatus?.backendError || 'Operation cancelled or timed out.'}
                                </div>
                                {mode === 'authenticate' && (
                                    <div style={{ fontSize: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: 12, borderRadius: 8, marginBottom: 16, color: '#fca5a5' }}>
                                        💡 Make sure you have registered your fingerprint first on this device before verifying.
                                    </div>
                                )}
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
