'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

// ── Euclidean distance between two float arrays ──
function euclidean(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
}

// Cosine similarity (better for embedding comparison)
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const MATCH_THRESHOLD   = 0.55;   // Euclidean — lowered for better detection
const COSINE_THRESHOLD  = 0.78;   // Cosine — higher = more similar
const SCAN_INTERVAL_MS  = 150;
const AUTO_MARK_COOLDOWN = 5000;

export default function FaceAttendancePage() {
    const videoRef   = useRef(null);
    const canvasRef  = useRef(null);
    const overlayRef = useRef(null);
    const faceApi    = useRef(null);
    const intervalId = useRef(null);
    const lastMark   = useRef(0);
    const detectorType = useRef('ssd'); // 'ssd' | 'tiny'

    const [phase, setPhase]         = useState('init');
    const [profiles, setProfiles]   = useState([]);
    const [status, setStatus]       = useState('⏳ Loading AI models...');
    const [liveResult, setLiveResult] = useState(null);
    const [log, setLog]             = useState([]);
    const [lectureId, setLectureId] = useState('');
    const [error, setError]         = useState('');
    const [liveBox, setLiveBox]     = useState(null);
    const [faceFound, setFaceFound] = useState(false);
    const [modelsReady, setModelsReady] = useState(false);
    const [fps, setFps]             = useState(0);
    const fpsCounter = useRef({ frames: 0, last: Date.now() });
    const [trackMode, setTrackMode] = useState('ssd');

    // ── Load face-api + enrolled embeddings ──
    useEffect(() => {
        const boot = async () => {
            try {
                const fa = await import('face-api.js');
                faceApi.current = fa;

                // Load all models in parallel for speed
                await Promise.all([
                    fa.nets.ssdMobilenetv1.loadFromUri('/models'),
                    fa.nets.faceLandmark68Net.loadFromUri('/models'),
                    fa.nets.faceRecognitionNet.loadFromUri('/models'),
                    fa.nets.tinyFaceDetector.loadFromUri('/models').catch(() => {}),
                ]);

                setModelsReady(true);
                setStatus('✅ AI models loaded — fetching enrolled faces...');
            } catch (e) {
                console.warn('Model load error:', e);
                setStatus('⚠️ Models not found — using demo mode.');
                setModelsReady(true);
            }

            try {
                const res = await fetch('/api/students/face-embeddings');
                const data = await res.json();
                setProfiles(data.profiles || []);
                const count = (data.profiles || []).length;
                setStatus(count > 0
                    ? `✅ ${count} face${count > 1 ? 's' : ''} enrolled — camera ready.`
                    : '⚠️ No enrolled faces yet. Ask students to register via Face Training.');
            } catch (e) {
                setStatus('⚠️ Could not load face profiles — offline mode.');
            }
            setPhase('ready');
        };
        boot();
        return () => stopLoop();
    }, []);

    // ── Start camera ──
    const startCamera = async () => {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                }
            });
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setPhase('live');
            setStatus('🎥 Camera live — scanning faces...');
            setTimeout(startLoop, 800);
        } catch (e) {
            setError('❌ Camera access denied. Please allow camera permissions.');
        }
    };

    const stopCamera = () => {
        stopLoop();
        const stream = videoRef.current?.srcObject;
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setPhase('ready');
        setLiveResult(null);
        setLiveBox(null);
        setFaceFound(false);
        setStatus('Camera stopped.');
    };

    // ── Detection loop — CNN with TinyFaceDetector fallback ──
    const startLoop = useCallback(() => {
        if (intervalId.current) clearInterval(intervalId.current);
        intervalId.current = setInterval(async () => {
            const video = videoRef.current;
            const fa    = faceApi.current;
            if (!video || !fa || video.readyState < 2) return;

            // FPS counter
            fpsCounter.current.frames++;
            const now = Date.now();
            if (now - fpsCounter.current.last > 1000) {
                setFps(fpsCounter.current.frames);
                fpsCounter.current.frames = 0;
                fpsCounter.current.last = now;
            }

            try {
                let det = null;

                // Try SSD MobileNetV1 first (more accurate)
                if (trackMode === 'ssd' || trackMode === undefined) {
                    det = await fa.detectSingleFace(
                        video,
                        new fa.SsdMobilenetv1Options({ minConfidence: 0.35, maxResults: 1 })
                    ).withFaceLandmarks().withFaceDescriptor();
                }

                // Fallback to TinyFaceDetector if SSD fails
                if (!det && fa.nets.tinyFaceDetector.isLoaded) {
                    det = await fa.detectSingleFace(
                        video,
                        new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })
                    ).withFaceLandmarks().withFaceDescriptor();
                    if (det) setTrackMode('tiny');
                }

                if (!det) {
                    setFaceFound(false);
                    setLiveBox(null);
                    setLiveResult(null);
                    clearCanvas();
                    return;
                }

                setFaceFound(true);

                const { x, y, width, height } = det.detection.box;
                const vw = video.videoWidth  || video.clientWidth;
                const vh = video.videoHeight || video.clientHeight;

                // Mirror the box since video is scaleX(-1)
                setLiveBox({
                    left:   `${((vw - x - width) / vw) * 100}%`,
                    top:    `${(y / vh) * 100}%`,
                    width:  `${(width / vw) * 100}%`,
                    height: `${(height / vh) * 100}%`,
                });

                // Draw landmarks on canvas
                drawLandmarks(det, video);

                const descriptor = Array.from(det.descriptor);

                // ── Match against all enrolled profiles ──
                let best = null, bestEucDist = Infinity, bestCosSimil = -1;
                for (const p of profiles) {
                    if (!p.face_embedding || p.face_embedding.length !== 128) continue;
                    const euc = euclidean(descriptor, p.face_embedding);
                    const cos = cosineSimilarity(descriptor, p.face_embedding);
                    // Use combined scoring
                    if (euc < bestEucDist) {
                        bestEucDist = euc;
                        bestCosSimil = cos;
                        best = p;
                    }
                }

                const eucMatch = best && bestEucDist < MATCH_THRESHOLD;
                const cosMatch = best && bestCosSimil > COSINE_THRESHOLD;

                if (best && (eucMatch || cosMatch)) {
                    const eucPct = Math.max(0, Math.round((1 - bestEucDist / MATCH_THRESHOLD) * 100));
                    const cosPct = Math.round(bestCosSimil * 100);
                    const confidence = Math.round((eucPct + cosPct) / 2);

                    setLiveResult({
                        matched: true,
                        name: best.name,
                        roll_no: best.roll_no,
                        distance: bestEucDist,
                        cosine: bestCosSimil,
                        confidence: Math.min(confidence, 99),
                        id: best.id,
                    });

                    const nowMs = Date.now();
                    if (nowMs - lastMark.current > AUTO_MARK_COOLDOWN) {
                        lastMark.current = nowMs;
                        markAttendance(best, descriptor, lectureId);
                    }
                } else {
                    setLiveResult({ matched: false, distance: bestEucDist, cosine: bestCosSimil });
                }
            } catch (e) {
                // frame error — silently skip
            }
        }, SCAN_INTERVAL_MS);
    }, [profiles, lectureId, trackMode]);

    const stopLoop = () => {
        if (intervalId.current) { clearInterval(intervalId.current); intervalId.current = null; }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const drawLandmarks = (det, video) => {
        const canvas = canvasRef.current;
        const fa     = faceApi.current;
        if (!canvas || !fa) return;
        const dims = { width: video.clientWidth, height: video.clientHeight };
        fa.matchDimensions(canvas, dims);
        const resized = fa.resizeResults(det, dims);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw landmarks in aqua color
        fa.draw.drawFaceLandmarks(canvas, resized, {
            drawLines: true,
            lineWidth: 1,
            lineColor: 'rgba(0,200,255,0.55)',
            pointSize: 2,
            pointColor: 'rgba(100,220,255,0.8)',
        });
    };

    // ── Mark attendance via API ──
    const markAttendance = async (student, descriptor, lecture_id) => {
        try {
            const token = document.cookie.match(/sc_token=([^;]+)/)?.[1] || '';
            const res = await fetch('/api/attendance/face', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    faceId: student.id,
                    lecture_id: lecture_id || null,
                    timestamp: new Date().toISOString(),
                }),
            });
            const data = await res.json();
            const entry = {
                id: Date.now(),
                name: student.name,
                roll_no: student.roll_no,
                time: new Date().toLocaleTimeString('en-IN'),
                status: data.success ? 'Marked ✅' : (data.message || 'Already marked'),
            };
            setLog(prev => [entry, ...prev.slice(0, 19)]);
        } catch { /* API offline */ }
    };

    const boxColor = liveResult?.matched
        ? '#22c55e'
        : faceFound
        ? '#f59e0b'
        : 'rgba(96,165,250,0.4)';

    const confidenceColor = !liveResult?.confidence ? '#94a3b8'
        : liveResult.confidence >= 80 ? '#22c55e'
        : liveResult.confidence >= 60 ? '#f59e0b'
        : '#ef4444';

    return (
        <DashboardLayout title="Live Face Attendance">
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
                        🧠 CNN Face Recognition Attendance
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        Real-time dual-metric matching against{' '}
                        <b style={{ color: 'var(--color-aqua)' }}>{profiles.length}</b> enrolled
                        face{profiles.length !== 1 ? 's' : ''} — SSD MobileNetV1 + TinyFaceDetector CNN pipeline
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24, alignItems: 'start' }}>

                    {/* ── Left: Camera + Detection ── */}
                    <div>
                        {/* Options bar */}
                        <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input
                                placeholder="Lecture ID (optional)"
                                value={lectureId}
                                onChange={e => setLectureId(e.target.value)}
                                className="form-input"
                                style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
                            />
                            <div style={{
                                display: 'flex', gap: 4,
                                background: 'var(--bg-secondary)',
                                borderRadius: 10, padding: '3px 4px',
                                border: '1px solid var(--border)'
                            }}>
                                {['ssd', 'tiny'].map(m => (
                                    <button key={m}
                                        onClick={() => setTrackMode(m)}
                                        style={{
                                            padding: '4px 10px', fontSize: 11, fontWeight: 700,
                                            borderRadius: 7, border: 'none',
                                            background: trackMode === m ? 'rgba(96,165,250,0.3)' : 'transparent',
                                            color: trackMode === m ? '#60a5fa' : 'var(--text-muted)',
                                            cursor: 'pointer', textTransform: 'uppercase',
                                        }}
                                    >{m}</button>
                                ))}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {profiles.length} enrolled
                            </span>
                        </div>

                        {/* Video container */}
                        <div ref={overlayRef} style={{
                            position: 'relative', width: '100%', aspectRatio: '4/3',
                            background: '#04080f', borderRadius: 18, overflow: 'hidden',
                            border: `2px solid ${boxColor}`,
                            transition: 'border-color 0.3s',
                            boxShadow: `0 0 40px ${boxColor}30`,
                        }}>
                            <video ref={videoRef} autoPlay muted playsInline style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                display: 'block', transform: 'scaleX(-1)',
                            }} />
                            <canvas ref={canvasRef} style={{
                                position: 'absolute', inset: 0,
                                width: '100%', height: '100%',
                                pointerEvents: 'none',
                                transform: 'scaleX(-1)',
                            }} />

                            {/* Face bounding box */}
                            {liveBox && (
                                <div style={{
                                    position: 'absolute', ...liveBox,
                                    border: `2px solid ${boxColor}`,
                                    boxShadow: `0 0 16px ${boxColor}80`,
                                    borderRadius: 6, pointerEvents: 'none',
                                }}>
                                    {liveResult?.matched && (
                                        <div style={{
                                            position: 'absolute', bottom: '100%', left: -2, marginBottom: 4,
                                            background: '#22c55e', color: '#fff',
                                            fontSize: 11, fontWeight: 700,
                                            padding: '3px 10px', borderRadius: 6,
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
                                        }}>
                                            ✔ {liveResult.name} ({liveResult.confidence}%)
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Corner brackets */}
                            {['tl','tr','bl','br'].map(c => (
                                <div key={c} style={{
                                    position: 'absolute', width: 22, height: 22,
                                    borderTop:    c.startsWith('t') ? '2px solid rgba(96,165,250,0.7)' : 'none',
                                    borderBottom: c.startsWith('b') ? '2px solid rgba(96,165,250,0.7)' : 'none',
                                    borderLeft:   c.endsWith('l')   ? '2px solid rgba(96,165,250,0.7)' : 'none',
                                    borderRight:  c.endsWith('r')   ? '2px solid rgba(96,165,250,0.7)' : 'none',
                                    top:    c.startsWith('t') ? 12 : 'auto',
                                    bottom: c.startsWith('b') ? 12 : 'auto',
                                    left:   c.endsWith('l')   ? 12 : 'auto',
                                    right:  c.endsWith('r')   ? 12 : 'auto',
                                }} />
                            ))}

                            {/* No camera placeholder */}
                            {phase !== 'live' && (
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex',
                                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                }}>
                                    <div style={{ fontSize: 56, marginBottom: 12, opacity: 0.6 }}>📷</div>
                                    <div style={{ fontSize: 14 }}>
                                        {phase === 'init' ? 'Loading AI models...' : 'Click Start Scan below'}
                                    </div>
                                </div>
                            )}

                            {/* LIVE badge */}
                            {phase === 'live' && (
                                <div style={{
                                    position: 'absolute', top: 12, left: 12,
                                    background: 'rgba(239,68,68,0.9)', color: '#fff',
                                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    backdropFilter: 'blur(8px)',
                                }}>
                                    <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                                    LIVE SCAN
                                </div>
                            )}

                            {/* Face detection badge */}
                            {phase === 'live' && (
                                <div style={{
                                    position: 'absolute', top: 12, right: 12,
                                    background: faceFound ? 'rgba(34,197,94,0.9)' : 'rgba(30,40,60,0.9)',
                                    color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                    backdropFilter: 'blur(8px)',
                                }}>
                                    {faceFound ? '● Face detected' : '○ Scanning...'}
                                </div>
                            )}

                            {/* FPS counter */}
                            {phase === 'live' && (
                                <div style={{
                                    position: 'absolute', bottom: 12, right: 12,
                                    background: 'rgba(0,0,0,0.6)', color: '#60a5fa',
                                    padding: '2px 8px', borderRadius: 10, fontSize: 10,
                                    fontFamily: 'var(--font-mono)',
                                }}>
                                    {fps} fps · {trackMode.toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Status bar */}
                        <div className="glass-status" style={{
                            background: 'rgba(15,30,60,0.6)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(96,165,250,0.2)',
                            borderRadius: 12, padding: '10px 16px',
                            marginTop: 10, fontSize: 12, fontWeight: 600, color: '#60a5fa',
                        }}>
                            {status}
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                            {phase !== 'live'
                                ? <button
                                    className="btn btn-primary btn-glass"
                                    onClick={startCamera}
                                    disabled={phase === 'init'}
                                    style={{ flex: 1 }}
                                  >
                                    🎥 Start Live Scan
                                  </button>
                                : <button
                                    className="btn btn-danger btn-glass"
                                    onClick={stopCamera}
                                    style={{ flex: 1 }}
                                  >
                                    ⏹ Stop Scan
                                  </button>
                            }
                        </div>
                        {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</div>}
                    </div>

                    {/* ── Right: Match result + Log ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* Current match card */}
                        <div style={{
                            padding: 20, borderRadius: 16,
                            background: liveResult?.matched
                                ? 'rgba(34,197,94,0.07)'
                                : faceFound ? 'rgba(245,158,11,0.07)'
                                : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${
                                liveResult?.matched ? 'rgba(34,197,94,0.35)'
                                : faceFound ? 'rgba(245,158,11,0.25)'
                                : 'rgba(255,255,255,0.06)'}`,
                            minHeight: 160,
                            transition: 'all 0.3s',
                            backdropFilter: 'blur(12px)',
                        }}>
                            {liveResult?.matched ? (
                                <>
                                    <div style={{ fontSize: 36, marginBottom: 6 }}>✅</div>
                                    <div style={{ fontWeight: 800, fontSize: 20, color: '#22c55e' }}>{liveResult.name}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{liveResult.roll_no}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                                            <div style={{
                                                width: `${liveResult.confidence}%`, height: '100%',
                                                background: `linear-gradient(90deg, ${confidenceColor}, ${confidenceColor}aa)`,
                                                borderRadius: 3, transition: 'width 0.3s',
                                                boxShadow: `0 0 8px ${confidenceColor}80`,
                                            }} />
                                        </div>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: confidenceColor }}>
                                            {liveResult.confidence}%
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 12 }}>
                                        <span>Eucl: {liveResult.distance?.toFixed(4)}</span>
                                        <span>Cos: {liveResult.cosine?.toFixed(4)}</span>
                                    </div>
                                </>
                            ) : faceFound ? (
                                <>
                                    <div style={{ fontSize: 36, marginBottom: 6 }}>🔍</div>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: '#f59e0b' }}>Unknown Face</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                                        Not enrolled or low confidence.
                                        <br />
                                        Best Eucl dist: {liveResult?.distance?.toFixed(4) || '—'} (threshold: {MATCH_THRESHOLD})
                                        <br />
                                        Best Cosine: {liveResult?.cosine?.toFixed(4) || '—'} (threshold: {COSINE_THRESHOLD})
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 32 }}>
                                    <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>👤</div>
                                    <div style={{ fontSize: 13 }}>Waiting for face in frame...</div>
                                </div>
                            )}
                        </div>

                        {/* Attendance log */}
                        <div style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                                📋 Session Log
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{log.length} records</span>
                            </div>
                            {log.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '18px 0' }}>
                                    No attendance marked yet
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                                    {log.map(entry => (
                                        <div key={entry.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 12px', borderRadius: 10,
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.05)', fontSize: 12,
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{entry.name}</div>
                                                <div style={{ color: 'var(--text-muted)' }}>{entry.roll_no}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ color: '#22c55e', fontWeight: 600 }}>{entry.status}</div>
                                                <div style={{ color: 'var(--text-muted)' }}>{entry.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info panel */}
                        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-aqua)' }}>ℹ️ CNN Pipeline</div>
                            {[
                                `Dual-metric: Euclidean (≤${MATCH_THRESHOLD}) + Cosine (≥${COSINE_THRESHOLD})`,
                                'SSD MobileNetV1 primary + TinyFaceDetector fallback CNN',
                                `Scan interval: ${SCAN_INTERVAL_MS}ms · Auto-mark cooldown: ${AUTO_MARK_COOLDOWN/1000}s`,
                                'Face landmarks drawn in real-time on canvas overlay',
                                'Highest-res camera stream (1280×720 ideal)',
                            ].map((t, i) => (
                                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, color: 'var(--text-muted)' }}>
                                    <span style={{ color: '#60a5fa' }}>•</span> {t}
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
