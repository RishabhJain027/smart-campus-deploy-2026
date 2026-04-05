// Simple webhook integration to push data to Google Sheets
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyst845nc2w7tN7UeC7h8Q6T-LySjK0Z5vwup1hJPKLb1Bb3oMdsFUC_Wjo6SqkZVInow/exec';

export async function appendToSheet(data) {
    try {
        // We map the array `data` into a structured JSON for the Webhook
        // Typical data: [id, student_id, name, action, date, status, method, time]
        const payload = {
            timestamp: data[7] || new Date().toISOString(),
            action: data[3] || 'Entry/Transaction',
            name: data[2] || 'Unknown',
            details: `Method: ${data[6] || '-'} | Status: ${data[5] || '-'} | ID: ${data[1] || '-'}`
        };

        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await res.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('Error appending to Google Sheet webhook:', error);
        return { success: false, error: error.message };
    }
}
