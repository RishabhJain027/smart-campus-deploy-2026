'use client';
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function FaceTrainingPage() {
    const [user, setUser] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [trainingState, setTrainingState] = useState('idle'); // idle|loading|detecting|done|error
    const [trainedEmbedding, setTrainedEmbedding] = useState(null);
    const [statusMsg, setStatusMsg] = useState('');
    const [saved, setSaved] = useState(false);
    const fileInputRef = useRef(null);
    const imgRef = useRef(null);
    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const [cameraMode, setCameraMode] = useState(false);
    const [streaming, setStreaming] = useState(false);

    useEffect(() => {
        const authUser = localStorage.getItem('sc_user');
        if (authUser) setUser(JSON.parse(authUser));
    }, []);

    // Load face-api models once
    const loadModels = async () => {
        const fa = await import('face-api.js');
        if (!fa.nets.ssdMobilenetv1.isLoaded) {
            setStatusMsg('Loading TensorFlow models...');
            await Promise.all([
                fa.nets.ssdMobilenetv1.loadFromUri('/models'),
                fa.nets.faceLandmark68Net.loadFromUri('/models'),
                fa.nets.faceRecognitionNet.loadFromUri('/models'),
            ]);
        }
        return fa;
    };

    // Try detect with progressively lower thresholds
    const detectFace = async (fa, source) => {
        const thresholds = [0.5, 0.35, 0.2, 0.1];
        for (const thresh of thresholds) {
            setStatusMsg(`Detecting face... (confidence ≥ ${thresh})`);
            const det = await fa.detectSingleFace(
                source,
                new fa.SsdMobilenetv1Options({ minConfidence: thresh })
            ).withFaceLandmarks().withFaceDescriptor();
            if (det) return det;
        }
        return null;
    };

    const processImage = async (source, previewUrl) => {
        setTrainingState('loading');
        setStatusMsg('Importing AI library...');
        setSaved(false);

        try {
            const fa = await loadModels();
            setTrainingState('detecting');
            setStatusMsg('Analyzing facial features...');

            // Wait for image to be in DOM if needed
            await new Promise(r => setTimeout(r, 200));

            const det = await detectFace(fa, source);

            if (!det) {
                setTrainingState('error');
                setStatusMsg('❌ No face detected. Upload a clearer, well-lit, front-facing photo.');
                return;
            }

            // Draw landmarks overlay
            if (canvasRef.current && imgRef.current) {
                const canvas = canvasRef.current;
                fa.matchDimensions(canvas, imgRef.current);
                const resized = fa.resizeResults(det, imgRef.current);
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                fa.draw.drawDetections(canvas, resized);
                fa.draw.drawFaceLandmarks(canvas, resized, {
                    drawLines: true,
                    lineColor: 'rgba(0,220,255,0.7)',
                    pointColor: 'rgba(100,230,255,0.9)',
                });
            }

            setTrainedEmbedding(Array.from(det.descriptor));
            setTrainingState('done');
            setStatusMsg(`✅ 128-D embedding extracted. Confidence: ${(det.detection.score * 100).toFixed(1)}%`);
        } catch (err) {
            console.error(err);
            setTrainingState('error');
            setStatusMsg('⚠️ AI model error - check /public/models folder.');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setImagePreview(url);
        setCameraMode(false);

        // Wait for image element to render
        await new Promise(r => setTimeout(r, 300));
        const img = new Image();
        img.src = url;
        await new Promise(r => { img.onload = r; });
        processImage(img, url);
    };

    // Camera capture
    const startCamera = async () => {
        setCameraMode(true);
        setImagePreview(null);
        setTrainingState('idle');
        setSaved(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setStreaming(true);
        } catch {
            setStatusMsg('Camera access denied.');
        }
    };

    const captureFromCamera = async () => {
        const v = videoRef.current;
        if (!v) return;
        const cvs = document.createElement('canvas');
        cvs.width = v.videoWidth;
        cvs.height = v.videoHeight;
        cvs.getContext('2d').drawImage(v, 0, 0);
        const url = cvs.toDataURL('image/jpeg', 0.92);
        setImagePreview(url);
        // Stop camera
        v.srcObject?.getTracks().forEach(t => t.stop());
        setStreaming(false);
        setCameraMode(false);

        await new Promise(r => setTimeout(r, 300));
        const img = new Image();
        img.src = url;
        await new Promise(r => { img.onload = r; });
        processImage(img, url);
    };

    const saveProfile = async () => {
        if (!user || !trainedEmbedding) return;
        setStatusMsg('Saving to database...');
        try {
            const res = await fetch('/api/students/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: user.id,
                    face_embedding: trainedEmbedding,
                }),
            });
            if (res.ok) {
                setSaved(true);
                setStatusMsg('✅ Face model saved! You can now use Face Check-In.');
            } else {
                setStatusMsg('❌ Failed to save. Check network and try again.');
            }
        } catch {
            setStatusMsg('❌ Network error. Retry.');
        }
    };

    if (!user) return (
        <DashboardLayout title="Face Training">
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading profile...</div>
        </DashboardLayout>
    );

    const stateColor = {
        idle: 'var(--color-aqua)',
        loading: '#f59e0b',
        detecting: '#60a5fa',
        done: '#22c55e',
        error: '#ef4444',
    }[trainingState] || 'var(--text-muted)';

    return (
        <DashboardLayout title="Face Training" breadcrumb="Profile / AI Identity">
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>🧠 AI Face Identity</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        Extract your 128-D facial embedding vector using a CNN model — stored securely in the cloud.
                    </p>
                </div>

                <div className="mirror-card" style={{ padding: 28 }}>

                    {/* Method selector */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
                        <button
                            className={`btn btn-sm ${!cameraMode ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => { setCameraMode(false); setStreaming(false); videoRef.current?.srcObject?.getTracks().forEach(t=>t.stop()); }}
                        >📁 Upload Photo</button>
                        <button
                            className={`btn btn-sm ${cameraMode ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={startCamera}
                        >📷 Use Camera</button>
                    </div>

                    {/* Preview area */}
                    <div onClick={() => !cameraMode && fileInputRef.current?.click()} style={{
                        width: '100%', aspectRatio: '4/3',
                        border: `2px dashed ${stateColor}`,
                        borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: cameraMode ? 'default' : 'pointer',
                        overflow: 'hidden', background: 'rgba(0,0,0,0.3)',
                        position: 'relative', marginBottom: 16,
                        transition: 'border-color 0.3s',
                    }}>
                        {/* Camera stream */}
                        <video ref={videoRef} autoPlay muted playsInline
                            style={{
                                position: 'absolute', inset: 0, width: '100%', height: '100%',
                                objectFit: 'cover', transform: 'scaleX(-1)',
                                display: streaming ? 'block' : 'none',
                            }}
                        />

                        {/* Image preview */}
                        {imagePreview && !cameraMode && (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <img ref={imgRef} src={imagePreview} alt="Face"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                <canvas ref={canvasRef} style={{
                                    position: 'absolute', top: 0, left: 0,
                                    width: '100%', height: '100%', pointerEvents: 'none',
                                }} />
                            </div>
                        )}

                        {/* Placeholder */}
                        {!imagePreview && !streaming && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                                <div style={{ fontSize: 48, marginBottom: 10, opacity: 0.5 }}>📷</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>Click to upload a photo</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>Clear, front-facing, well-lit face</div>
                            </div>
                        )}

                        {/* Processing overlays */}
                        {(trainingState === 'loading' || trainingState === 'detecting') && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,4,16,0.85)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', gap: 12,
                            }}>
                                <div style={{
                                    width: 40, height: 40, border: '3px solid rgba(96,165,250,0.3)',
                                    borderTop: '3px solid #60a5fa', borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                                <div style={{ color: '#60a5fa', fontSize: 13, fontWeight: 600 }}>{statusMsg}</div>
                            </div>
                        )}

                        {/* Done badge */}
                        {trainingState === 'done' && (
                            <div style={{
                                position: 'absolute', bottom: 10, left: 10,
                                background: '#22c55e', color: '#fff',
                                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                                boxShadow: '0 2px 12px rgba(34,197,94,0.5)',
                            }}>✅ Face Detected</div>
                        )}
                    </div>

                    <input type="file" ref={fileInputRef} onChange={handleImageUpload}
                        style={{ display: 'none' }} accept="image/*" />

                    {/* Status bar */}
                    {statusMsg && (
                        <div style={{
                            padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                            background: `${stateColor}15`,
                            border: `1px solid ${stateColor}40`,
                            fontSize: 13, fontWeight: 600, color: stateColor,
                        }}>{statusMsg}</div>
                    )}

                    {/* Camera capture button */}
                    {streaming && (
                        <button className="btn btn-mirror" onClick={captureFromCamera} style={{ width: '100%', marginBottom: 10, height: 46 }}>
                            📸 Capture Photo
                        </button>
                    )}

                    {/* Save button */}
                    <button
                        onClick={saveProfile}
                        disabled={trainingState !== 'done' || saved}
                        className={`btn ${trainingState === 'done' && !saved ? 'btn-primary btn-glass' : 'btn-ghost'}`}
                        style={{ width: '100%', height: 48, fontSize: 14, fontWeight: 700 }}
                    >
                        {saved ? '✅ Saved to Cloud!' : trainingState === 'done' ? '💾 Save Face Model to Cloud' : 'Awaiting Photo...'}
                    </button>

                    {/* Embedding preview */}
                    {trainedEmbedding && (
                        <div style={{
                            marginTop: 16, padding: 12, borderRadius: 10,
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(96,165,250,0.15)',
                            fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                        }}>
                            <div style={{ color: '#60a5fa', marginBottom: 4, fontSize: 10, fontWeight: 600 }}>
                                128-D EMBEDDING VECTOR (first 8 values)
                            </div>
                            [{trainedEmbedding.slice(0, 8).map(v => v.toFixed(4)).join(', ')}, ...]
                        </div>
                    )}

                    {/* Tips */}
                    <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-aqua)' }}>📋 Tips for best results:</div>
                        {[
                            'Face should fill most of the frame',
                            'Good lighting — avoid strong backlight',
                            'Look directly at the camera',
                            'Remove sunglasses or face covering',
                            'No extreme filters or edits on the photo',
                        ].map((t, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                                <span style={{ color: '#22c55e' }}>✓</span> {t}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
