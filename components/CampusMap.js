'use client';
import { useState } from 'react';

export default function CampusMap({ activeGates = ['main_gate'] }) {
    const [hovered, setHovered] = useState(null);

    return (
        <div className="card-glass" style={{ padding: 24, paddingBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>Campus Entry Nodes</h3>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green)' }} /> ONLINE
                    </div>
                </div>
            </div>

            <div style={{ position: 'relative', background: 'rgba(0,0,0,0.15)', borderRadius: 12, overflow: 'hidden', height: 260 }}>
                {/* Simplified Isometric SVG Map */}
                <svg viewBox="0 0 800 500" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}>
                    <defs>
                        <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="rgba(59,130,246,0.1)" />
                            <stop offset="100%" stopColor="rgba(59,130,246,0.02)" />
                        </linearGradient>
                    </defs>
                    
                    {/* Ground Plane */}
                    <path d="M400 50 L750 250 L400 450 L50 250 Z" fill="url(#gridGrad)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    
                    {/* Building Blocks */}
                    <path d="M350 180 L450 130 L550 180 L450 230 Z" fill="rgba(30,41,59,0.8)" stroke="grey" strokeWidth="0.5" /> {/* Main Block */}
                    <path d="M350 180 L350 230 L450 280 L450 230 Z" fill="rgba(15,23,42,0.9)" />
                    <path d="M450 230 L450 280 L550 230 L550 180 Z" fill="rgba(10,15,24,0.9)" />

                    {/* Gate Markers */}
                    {[
                        { id: 'main_gate', x: 250, y: 320, label: 'Main Entrance' },
                        { id: 'lib_gate', x: 550, y: 150, label: 'Library Block' },
                        { id: 'lab_gate', x: 150, y: 220, label: 'Research Lab' },
                    ].map((gate) => (
                        <g key={gate.id} 
                           onMouseEnter={() => setHovered(gate.id)} 
                           onMouseLeave={() => setHovered(null)}
                           style={{ cursor: 'pointer' }}>
                            {/* Pulse Effect */}
                            {activeGates.includes(gate.id) && (
                                <circle cx={gate.x} cy={gate.y} r="12" fill="var(--color-blue)" opacity="0.3">
                                    <animate attributeName="r" from="8" to="24" dur="1.5s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                                </circle>
                            )}
                            <circle cx={gate.x} cy={gate.y} r="6" fill={activeGates.includes(gate.id) ? 'var(--color-blue)' : 'var(--text-muted)'} />
                            
                            {/* Hover Label */}
                            {hovered === gate.id && (
                                <foreignObject x={gate.x - 60} y={gate.y - 50} width="120" height="40">
                                    <div style={{ 
                                        background: 'rgba(15,23,42,0.95)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: 6, 
                                        padding: '4px 10px', 
                                        fontSize: 11, 
                                        color: '#fff',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                    }}>
                                        {gate.label}
                                    </div>
                                </foreignObject>
                            )}
                        </g>
                    ))}
                </svg>

                {/* Legend Overlay */}
                <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: 4 }}>
                    Hover markers to see gate details
                </div>
            </div>
        </div>
    );
}
