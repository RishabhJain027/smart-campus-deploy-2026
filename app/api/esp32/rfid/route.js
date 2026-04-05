// app/api/esp32/rfid/route.js
import { NextResponse } from 'next/server';
import { localDB } from '@/lib/localDB';
import { appendToSheet } from '@/lib/sheets';

// Webhook for ESP32 hardware to hit when a card is scanned
export async function POST(req) {
    try {
        const body = await req.json();
        const { hardware_id, rfid_uid, action } = body;
        
        // action can be "attendance" or "canteen" or "gate"
        const mode = action || 'gate';

        if (!rfid_uid) {
            return NextResponse.json({ error: 'Missing RFID UID' }, { status: 400 });
        }

        // 1. Find user by student_id OR RFID
        const users = localDB.getStudents();
        let student = null;
        if (body.student_id) {
            student = users.find(u => u.id === body.student_id);
        } else {
            student = users.find(u => u.rfid_uid && u.rfid_uid.replace(/\s/g, '').toUpperCase() === rfid_uid.replace(/\s/g, '').toUpperCase());
        }

        if (!student) {
            return NextResponse.json({ 
                success: false, 
                message: 'UNKNOWN CARD', 
                status_code: 404 
            });
        }

        const now = new Date().toISOString();

        // 2. Handle Gate Entry / Attendance
        if (mode === 'gate' || mode === 'attendance') {
            const entry = {
                id: `ent_esp_${Date.now()}`,
                student_id: student.id,
                name: student.name,
                gate: hardware_id || 'Main Campus Gate',
                method: 'RFID',
                status: 'granted',
                time: now
            };
            
            localDB.addEntry(entry);
            
            // Sync to sheets
            try {
                await appendToSheet([
                    entry.id, entry.student_id, entry.name, 
                    'Campus Entry', new Date().toISOString().split('T')[0], 
                    entry.status, entry.method, entry.time
                ]);
            } catch(e) {}

            return NextResponse.json({ 
                success: true, 
                message: `ACCESS GRANTED: ${student.name.split(' ')[0]}`,
                lcd_line1: "ACCESS GRANTED",
                lcd_line2: student.name.substring(0, 16)
            });
        }

        // 3. Handle Canteen Payment
        if (mode === 'canteen') {
            const amount = parseFloat(body.amount || 0);
            if (student.wallet_balance < amount) {
                return NextResponse.json({ 
                    success: false, 
                    message: "INSUFFICIENT FUNDS",
                    lcd_line1: "TXN FAILED",
                    lcd_line2: "Low Balance"
                });
            }

            // Deduct balance
            const newBalance = student.wallet_balance - amount;
            localDB.updateUser(student.id, { wallet_balance: newBalance });

            // Sync to sheets
            try {
                // array format: [id, student_id, name, action, date, status, method, time]
                await appendToSheet([
                    `txn_${Date.now()}`, 
                    student.id, 
                    student.name, 
                    `Payment: Rs.${amount}`, 
                    new Date().toISOString().split('T')[0], 
                    'SUCCESS', 
                    body.rfid_uid === 'Biometric_Auth' ? 'Biometrics' : 'RFID', 
                    new Date().toISOString()
                ]);
            } catch(e) {}

            return NextResponse.json({ 
                success: true, 
                message: `PAID: Rs.${amount}. Bal: Rs.${newBalance}`,
                lcd_line1: `PAID Rs.${amount}`,
                lcd_line2: `BAL Rs.${newBalance}`
            });
        }

        return NextResponse.json({ success: false, message: 'Invalid action mode' });

    } catch (err) {
        console.error('ESP32 webhook error:', err);
        return NextResponse.json({ error: 'Internal Hardware Server Error' }, { status: 500 });
    }
}
