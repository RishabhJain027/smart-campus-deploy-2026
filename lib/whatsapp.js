// lib/whatsapp.js
// WhatsApp integration using Meta WhatsApp Cloud API
// Admin phone: 7208416569

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const ADMIN_PHONE = '917208416569'; // Admin WhatsApp number

export async function sendWhatsAppMessage(to, message) {
    if (!to) return { success: false, error: 'No phone number provided' };

    // Clean phone number
    const cleanPhone = to.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // If Meta API token is configured, use it
    if (ACCESS_TOKEN && PHONE_NUMBER_ID) {
        try {
            const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: finalPhone,
                    type: 'text',
                    text: { body: message },
                }),
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`[WhatsApp] Message sent to ${finalPhone}`);
                return { success: true, messageId: data.messages?.[0]?.id };
            } else {
                console.error('[WhatsApp] API Error:', data.error?.message);
                return { success: false, error: data.error?.message || 'API error' };
            }
        } catch (error) {
            console.error('[WhatsApp] Network Error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Fallback: try local whatsapp-server.js microservice on port 3001
    try {
        const response = await fetch('http://localhost:3001/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: to, message }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to send via local service');
        }

        console.log(`[WhatsApp] Sent via local service to ${finalPhone}`);
        return { success: true };
    } catch (error) {
        // Final fallback: log the message (demo mode)
        console.log(`[WhatsApp DEMO] Would send to ${finalPhone}:\n${message.substring(0, 100)}...`);
        return { success: true, demo: true, message: 'Sent in demo mode (no API configured)' };
    }
}

// Send notification to admin
export async function notifyAdmin(message) {
    return sendWhatsAppMessage(ADMIN_PHONE, message);
}

// ── Message Templates ──────────────────────────────────────────

export function buildAttendanceMessage(studentName, subject, time, status) {
    return `🎓 *PSR Campus System*\n\nHello *${studentName}*,\n\nYour attendance has been recorded.\n\n📚 *Subject:* ${subject}\n📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}\n🕐 *Time:* ${time}\n✅ *Status:* ${status}\n\n_PSR Campus Entry & Attendance System_`;
}

export function buildMonthlyReport(studentName, month, total, present, absent) {
    const percentage = Math.round((present / total) * 100);
    return `📊 *Monthly Attendance Report*\n\n👤 *Student:* ${studentName}\n📅 *Month:* ${month}\n\n📋 Total Lectures: ${total}\n✅ Present: ${present}\n❌ Absent: ${absent}\n📈 Attendance: *${percentage}%*\n\n${percentage < 75 ? '⚠️ *Low attendance warning! Please improve.*' : '🌟 Great attendance this month!'}\n\n_PSR Campus System_`;
}

export function buildPaymentReceiptMessage(studentName, items, totalAmount, newBalance, txnId) {
    const itemList = items.map(i => `  • ${i.name} — ₹${i.price}`).join('\n');
    return `🍔 *PSR Campus Canteen*\n\n💰 *Payment Confirmation*\n\n👤 *Student:* ${studentName}\n🧾 *Transaction ID:* ${txnId}\n📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}\n🕐 *Time:* ${new Date().toLocaleTimeString('en-IN')}\n\n📋 *Items:*\n${itemList}\n\n💵 *Total:* ₹${totalAmount}\n💳 *Remaining Balance:* ₹${newBalance}\n\n_PSR Campus Cashless Canteen_`;
}

export function buildGateEntryMessage(studentName, gate, time, method) {
    return `🚪 *PSR Campus Gate Entry*\n\n👤 *Student:* ${studentName}\n🏫 *Gate:* ${gate}\n🕐 *Time:* ${time}\n🔑 *Method:* ${method}\n\n✅ Entry Recorded Successfully\n\n_PSR Campus Security System_`;
}

export function buildAlertMessage(type, details) {
    return `🚨 *PSR Campus Alert*\n\n⚠️ *Type:* ${type}\n📋 *Details:* ${details}\n📅 *Time:* ${new Date().toLocaleString('en-IN')}\n\n_PSR Campus Admin System_`;
}

export function buildTeacherAddedMessage(teacherName, email, department) {
    return `👨‍🏫 *PSR Campus - New Teacher Added*\n\n👤 *Name:* ${teacherName}\n📧 *Email:* ${email}\n🏢 *Department:* ${department}\n📅 *Added:* ${new Date().toLocaleDateString('en-IN')}\n\n🔑 *Default Password:* Test@1234\n\n_Please change your password after first login._\n\n_PSR Campus Admin System_`;
}

export function buildBroadcastMessage(senderName, subject, body) {
    return `📢 *PSR Campus Broadcast*\n\n👤 *From:* ${senderName}\n📋 *Subject:* ${subject}\n\n${body}\n\n📅 *Sent:* ${new Date().toLocaleString('en-IN')}\n\n_PSR Campus Communication System_`;
}
