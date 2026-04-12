import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, notifyAdmin, buildAttendanceMessage, buildPaymentReceiptMessage, buildGateEntryMessage, buildAlertMessage, buildTeacherAddedMessage, buildBroadcastMessage } from '@/lib/whatsapp';

export async function POST(req) {
    try {
        const body = await req.json();
        const { type, phone, data } = body;

        if (!type) {
            return NextResponse.json({ error: 'Missing notification type' }, { status: 400 });
        }

        let message = '';
        let targetPhone = phone;

        switch (type) {
            case 'attendance':
                message = buildAttendanceMessage(
                    data.studentName, data.subject, data.time, data.status || 'Present'
                );
                break;

            case 'payment_receipt':
                message = buildPaymentReceiptMessage(
                    data.studentName, data.items || [], data.totalAmount, data.newBalance, data.txnId
                );
                // Also notify admin
                await notifyAdmin(`💰 Canteen Payment: ${data.studentName} paid ₹${data.totalAmount}. Balance: ₹${data.newBalance}`);
                break;

            case 'gate_entry':
                message = buildGateEntryMessage(
                    data.studentName, data.gate, data.time, data.method
                );
                break;

            case 'alert':
                message = buildAlertMessage(data.alertType, data.details);
                targetPhone = null; // Admin only
                await notifyAdmin(message);
                return NextResponse.json({ success: true, message: 'Alert sent to admin' });

            case 'teacher_added':
                message = buildTeacherAddedMessage(data.name, data.email, data.department);
                // Notify admin about new teacher
                await notifyAdmin(`👨‍🏫 New teacher added: ${data.name} (${data.department})`);
                break;

            case 'broadcast':
                message = buildBroadcastMessage(data.senderName, data.subject, data.body);
                // Send to multiple phones
                if (data.phones && Array.isArray(data.phones)) {
                    const results = await Promise.all(
                        data.phones.map(p => sendWhatsAppMessage(p, message))
                    );
                    return NextResponse.json({
                        success: true,
                        sent: results.filter(r => r.success).length,
                        total: data.phones.length,
                        message: `Broadcast sent to ${results.filter(r => r.success).length}/${data.phones.length} recipients`
                    });
                }
                break;

            case 'custom':
                message = data.message || '';
                break;

            default:
                return NextResponse.json({ error: `Unknown notification type: ${type}` }, { status: 400 });
        }

        if (!message) {
            return NextResponse.json({ error: 'Could not build message' }, { status: 400 });
        }

        if (targetPhone) {
            const result = await sendWhatsAppMessage(targetPhone, message);
            return NextResponse.json({
                success: true,
                ...result,
                preview: message
            });
        }

        return NextResponse.json({ success: true, preview: message });

    } catch (err) {
        console.error('WhatsApp notification error:', err);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
}
