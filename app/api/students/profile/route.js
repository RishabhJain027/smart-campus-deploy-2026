// app/api/students/profile/route.js
import { NextResponse } from 'next/server';
import { localDB } from '@/lib/localDB';

export async function POST(req) {
    try {
        const body = await req.json();
        const { student_id, rfid_uid, face_embedding, image_url, passkey_id } = body;

        if (!student_id) {
            return NextResponse.json({ error: 'Missing student ID' }, { status: 400 });
        }

        const updates = {};
        if (rfid_uid !== undefined) updates.rfid_uid = rfid_uid;
        if (face_embedding !== undefined) {
             updates.face_embedding = face_embedding;
             updates.face_status = 'trained';
        }
        if (image_url !== undefined) updates.profile_photo = image_url;
        if (passkey_id !== undefined) {
            updates.passkey_id = passkey_id;
            updates.biometric_registered = true;
            updates.biometric_registered_at = new Date().toISOString();
        }

        const updatedUser = localDB.updateUser(student_id, updates);

        if (!updatedUser) {
            return NextResponse.json({ error: 'Student not found in database' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user: updatedUser }, { status: 200 });

    } catch (err) {
        console.error('Update profile error:', err);
        return NextResponse.json({ error: 'Failed to update student profile' }, { status: 500 });
    }
}
