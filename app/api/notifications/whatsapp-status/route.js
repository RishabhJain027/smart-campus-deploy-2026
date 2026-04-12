import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// GET: check which provider is configured
export async function GET() {
    const providers = {
        callmebot: !!process.env.CALLMEBOT_API_KEY && process.env.CALLMEBOT_API_KEY !== 'your-callmebot-api-key',
        meta: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID &&
            process.env.WHATSAPP_ACCESS_TOKEN !== 'your-meta-access-token'),
        local: false, // checked at runtime
    };

    const activeProvider = providers.callmebot ? 'callmebot' : providers.meta ? 'meta' : 'demo';

    return NextResponse.json({
        status: activeProvider === 'demo' ? 'demo' : 'active',
        activeProvider,
        providers,
        adminPhone: process.env.WHATSAPP_ADMIN_PHONE || '917208416569',
        instructions: {
            callmebot: {
                name: 'CallMeBot (FREE)',
                steps: [
                    "Open WhatsApp on your phone (7208416569)",
                    "Send this exact message to +34 644 62 76 92:",
                    '"I allow callmebot to send me messages"',
                    "Wait ~30 seconds — you'll receive your API key on WhatsApp",
                    "Add CALLMEBOT_API_KEY=<your-key> to Render environment variables",
                    "Redeploy on Render"
                ]
            }
        }
    });
}

// POST: send test message
export async function POST(req) {
    try {
        const { phone, message } = await req.json();
        const testPhone = phone || process.env.WHATSAPP_ADMIN_PHONE || '917208416569';
        const testMessage = message || `🧪 *PSR Campus - WhatsApp Test*\n\n✅ This is a test message from your Smart Campus system!\n\n📅 Sent at: ${new Date().toLocaleString('en-IN')}\n\n_PSR Campus System is live and connected!_`;

        const result = await sendWhatsAppMessage(testPhone, testMessage);

        return NextResponse.json({
            ...result,
            phone: testPhone,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
