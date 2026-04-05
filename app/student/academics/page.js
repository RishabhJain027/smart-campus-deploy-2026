'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const MOCK_GRADES = [
    { subject: 'Data Structures', code: 'CS301', credits: 4, midterm: 38, endterm: 72, internal: 18, total: 88, grade: 'A+', sgpa: 10 },
    { subject: 'Operating Systems', code: 'CS302', credits: 4, midterm: 32, endterm: 65, internal: 16, total: 81, grade: 'A', sgpa: 9 },
    { subject: 'Computer Networks', code: 'CS303', credits: 3, midterm: 28, endterm: 58, internal: 14, total: 72, grade: 'B+', sgpa: 8 },
    { subject: 'Database Systems', code: 'CS304', credits: 4, midterm: 40, endterm: 78, internal: 19, total: 97, grade: 'O', sgpa: 10 },
    { subject: 'Software Engineering', code: 'CS305', credits: 3, midterm: 34, endterm: 62, internal: 15, total: 77, grade: 'A', sgpa: 9 },
    { subject: 'Env. Studies', code: 'HS301', credits: 2, midterm: 22, endterm: 40, internal: 12, total: 62, grade: 'B', sgpa: 7 },
];

const SEMESTERS = [
    { sem: 'Sem 1', sgpa: 8.2, credits: 22 },
    { sem: 'Sem 2', sgpa: 8.5, credits: 24 },
    { sem: 'Sem 3', sgpa: 8.8, credits: 22 },
    { sem: 'Sem 4', sgpa: 9.1, credits: 24 },
    { sem: 'Sem 5', sgpa: 8.9, credits: 20 },
];

export default function StudentAcademics() {
    const [selectedSem, setSelectedSem] = useState('current');

    const totalCredits = MOCK_GRADES.reduce((s, g) => s + g.credits, 0);
    const weightedSum = MOCK_GRADES.reduce((s, g) => s + g.sgpa * g.credits, 0);
    const sgpa = (weightedSum / totalCredits).toFixed(2);
    const cgpa = ((SEMESTERS.reduce((s, sem) => s + sem.sgpa * sem.credits, 0) + weightedSum) /
        (SEMESTERS.reduce((s, sem) => s + sem.credits, 0) + totalCredits)).toFixed(2);

    const gradeColor = (grade) => {
        if (grade === 'O' || grade === 'A+') return '#10b981';
        if (grade === 'A') return '#3b82f6';
        if (grade === 'B+') return '#f59e0b';
        if (grade === 'B') return '#f97316';
        return '#ef4444';
    };

    return (
        <DashboardLayout title="Academic Records" breadcrumb="My Grades">
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>🎓 Academic Records</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Track grades, SGPA, CGPA, and semester performance across your program.</p>
            </div>

            {/* Score Cards */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                    { icon: '📊', label: 'Current SGPA', value: sgpa, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                    { icon: '🎓', label: 'CGPA', value: cgpa, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                    { icon: '📚', label: 'Total Credits', value: totalCredits, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
                    { icon: '⭐', label: 'Highest Grade', value: 'O (97/100)', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                ].map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-icon" style={{ background: s.bg }}><span style={{ fontSize: 26 }}>{s.icon}</span></div>
                        <div className="stat-info">
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid-2" style={{ alignItems: 'start', marginBottom: 24 }}>
                {/* Semester History */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📈 Semester History</h3>
                    {SEMESTERS.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#3b82f6' }}>
                                {s.sem.replace('Sem ', 'S')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.sem}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.credits} credits</div>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: s.sgpa >= 9 ? '#10b981' : s.sgpa >= 8 ? '#3b82f6' : '#f59e0b' }}>
                                {s.sgpa}
                            </div>
                        </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'rgba(16,185,129,0.06)', borderRadius: 8, marginTop: 8, paddingLeft: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#10b981' }}>
                            S6
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Current Semester</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalCredits} credits</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#10b981' }}>{sgpa}</div>
                    </div>
                </div>

                {/* CGPA Ring */}
                <div className="card" style={{ textAlign: 'center', padding: '28px 24px' }}>
                    <div style={{
                        width: 160, height: 160, borderRadius: '50%',
                        background: `conic-gradient(#3b82f6 ${(cgpa / 10) * 360}deg, rgba(255,255,255,0.06) 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <div style={{
                            width: 120, height: 120, borderRadius: '50%',
                            background: 'var(--bg-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                        }}>
                            <div style={{ fontSize: 32, fontWeight: 900, color: '#3b82f6' }}>{cgpa}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CGPA</div>
                        </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Cumulative Score</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        {cgpa >= 8.5 ? '🏆 First Class with Distinction' : cgpa >= 7 ? '🎖 First Class' : '📜 Second Class'}
                    </div>
                </div>
            </div>

            {/* Grades Table */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '20px 24px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>📋 Current Semester Grades</h3>
                </div>
                <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Code</th>
                                <th>Credits</th>
                                <th>Midterm</th>
                                <th>Endterm</th>
                                <th>Internal</th>
                                <th>Total</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_GRADES.map((g, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600, fontSize: 13 }}>{g.subject}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-cyan)' }}>{g.code}</td>
                                    <td style={{ textAlign: 'center' }}>{g.credits}</td>
                                    <td>{g.midterm}/40</td>
                                    <td>{g.endterm}/80</td>
                                    <td>{g.internal}/20</td>
                                    <td style={{ fontWeight: 700 }}>{g.total}/100</td>
                                    <td>
                                        <span style={{ fontWeight: 800, fontSize: 14, color: gradeColor(g.grade), padding: '4px 10px', background: `${gradeColor(g.grade)}18`, borderRadius: 6 }}>
                                            {g.grade}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
