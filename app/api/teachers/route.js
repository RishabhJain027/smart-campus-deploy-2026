import { NextResponse } from 'next/server';
import { localDB } from '@/lib/localDB';
import bcrypt from 'bcryptjs';

export async function GET(req) {
    try {
        const teachers = localDB.getTeachers().map(t => ({
            ...t,
            password_hash: undefined
        }));
        return NextResponse.json({ teachers });
    } catch (err) {
        console.error('Teachers GET error:', err);
        return NextResponse.json({ teachers: [] });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, department, phone, action } = body;

        // Handle delete
        if (action === 'delete') {
            const { id } = body;
            if (!id) return NextResponse.json({ error: 'Missing teacher ID' }, { status: 400 });
            
            const users = localDB.getUsers();
            const idx = users.findIndex(u => u.id === id && u.role === 'teacher');
            if (idx === -1) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
            
            users.splice(idx, 1);
            const fs = require('fs');
            const path = require('path');
            fs.writeFileSync(path.join(process.cwd(), 'data', 'users.json'), JSON.stringify(users, null, 2));
            
            return NextResponse.json({ success: true, message: 'Teacher deleted' });
        }

        // Handle update
        if (action === 'update') {
            const { id } = body;
            if (!id) return NextResponse.json({ error: 'Missing teacher ID' }, { status: 400 });
            
            const updates = {};
            if (name) updates.name = name;
            if (email) updates.email = email;
            if (department) updates.department = department;
            if (phone) updates.phone = phone;
            
            localDB.updateUser(id, updates);
            return NextResponse.json({ success: true, message: 'Teacher updated' });
        }

        // Handle add (default)
        if (!name || !email || !department) {
            return NextResponse.json({ error: 'Name, email, and department are required' }, { status: 400 });
        }

        // Check if email already exists
        const existing = localDB.getUserByEmail(email);
        if (existing) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
        }

        // Generate teacher ID
        const allTeachers = localDB.getTeachers();
        const nextNum = allTeachers.length + 1;
        const teacherId = `teacher_${String(nextNum).padStart(3, '0')}`;

        const defaultPasswordHash = bcrypt.hashSync('Test@1234', 12);

        const newTeacher = {
            id: teacherId,
            name,
            email,
            password_hash: defaultPasswordHash,
            role: 'teacher',
            department,
            phone: phone || '',
            approved: true,
            semester: '',
            created_at: new Date().toISOString(),
        };

        localDB.addUser(newTeacher);

        // Send WhatsApp notification to admin
        try {
            const { notifyAdmin } = await import('@/lib/whatsapp');
            await notifyAdmin(`👨‍🏫 New teacher added:\n👤 ${name}\n📧 ${email}\n🏢 ${department}`);
        } catch (e) {}

        return NextResponse.json({
            success: true,
            id: teacherId,
            message: `Teacher ${name} added successfully`,
            teacher: { ...newTeacher, password_hash: undefined }
        });
    } catch (err) {
        console.error('Teachers POST error:', err);
        return NextResponse.json({ error: 'Failed to process teacher request' }, { status: 500 });
    }
}
