// app/api/students/route.js
import { NextResponse } from 'next/server';
import { localDB } from '@/lib/localDB';
import bcrypt from 'bcryptjs';

export async function GET(req) {
    const students = localDB.getStudents().map(s => ({
        id: s.id, name: s.name, email: s.email,
        department: s.department, semester: s.semester,
        phone: s.phone, approved: s.approved,
        rfid_uid: s.rfid_uid, face_status: s.face_status,
        profile_photo: s.profile_photo,
        wallet_balance: s.wallet_balance || 0,
        created_at: s.created_at,
    }));
    return NextResponse.json({ students });
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, department, semester, phone, rfid_uid, password } = body;

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const existing = localDB.getUserByEmail(email);
        if (existing) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
        }

        const allStudents = localDB.getStudents();
        const nextNum = allStudents.length + 1;
        const studentId = `student_${String(nextNum).padStart(3, '0')}`;
        const passwordHash = bcrypt.hashSync(password || 'Test@1234', 12);

        const newStudent = {
            id: studentId, name, email,
            password_hash: passwordHash,
            role: 'student',
            department: department || 'Computer Science',
            semester: semester || '1',
            phone: phone || '',
            rfid_uid: rfid_uid || '',
            face_status: 'unregistered',
            wallet_balance: 60000,
            approved: true,
            created_at: new Date().toISOString(),
        };

        localDB.addUser(newStudent);

        return NextResponse.json({
            success: true, id: studentId,
            message: `Student ${name} added successfully`,
        });
    } catch (err) {
        console.error('Add student error:', err);
        return NextResponse.json({ error: 'Failed to add student' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const users = localDB.getUsers();
        const idx = users.findIndex(u => u.id === id && u.role === 'student');
        if (idx === -1) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        users.splice(idx, 1);

        const fs = (await import('fs')).default;
        const path = (await import('path')).default;
        fs.writeFileSync(path.join(process.cwd(), 'data', 'users.json'), JSON.stringify(users, null, 2));

        return NextResponse.json({ success: true, message: 'Student removed' });
    } catch (err) {
        console.error('Delete student error:', err);
        return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
    }
}
