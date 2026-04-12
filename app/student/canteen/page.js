'use client';
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BiometricsManager from '@/components/BiometricsManager';
import FacePayment from '@/components/FacePayment';

const MENU_ITEMS = [
    { id: 1, name: 'Mumbai Vada Pav', price: 20, icon: '🍔', desc: 'Spicy potato fritter, garlic chutney, fried green chilli, soft pav', category: 'Mumbai Special' },
    { id: 2, name: 'Misal Pav 🌶️', price: 70, icon: '🍲', desc: 'Spicy sprouted moth bean curry, farsan, onions, lemon, butter pav', category: 'Mumbai Special' },
    { id: 3, name: 'Bombay Sandwich', price: 50, icon: '🥪', desc: 'Beetroot, boiled potato, cucumber, green chutney, toasted', category: 'Mumbai Special' },
    { id: 4, name: 'Pav Bhaji', price: 110, icon: '🍛', desc: 'Mashed mixed vegetable curry, Amul butter, toasted pav, onions', category: 'Mumbai Special' },
    { id: 5, name: 'Special Veg Thali', price: 180, icon: '🍱', desc: 'Paneer Makhani, Dal Tadka, 3 Butter Rotis, Jeera Rice, Gulab Jamun, Papad', category: 'Thalis' },
    { id: 6, name: 'Maharashtrian Thali', price: 160, icon: '🍛', desc: 'Pithla, Bhakri/Chapati, Bharli Vangi, Varan Bhaat, Thecha, Kanda', category: 'Thalis' },
    { id: 7, name: 'Student Mini Thali', price: 90, icon: '🍛', desc: 'Aloo Sabzi, Dal Fry, 2 Rotis, Steamed Rice, Pickle', category: 'Thalis' },
    { id: 8, name: 'Cyber Burger', price: 120, icon: '🍔', desc: 'Plant-based patty, neon relish, lettuce, cheese slice, sesame bun', category: 'Fast Food' },
    { id: 9, name: 'Truffle Cheese Fries', price: 80, icon: '🍟', desc: 'Golden crispy fries, melted cheese, truffle oil, peri-peri sprinkle', category: 'Fast Food' },
    { id: 10, name: 'Cutting Chai', price: 15, icon: '☕', desc: 'Strong ginger-cardamom infused hot Mumbai tea', category: 'Beverages' },
    { id: 11, name: 'Filter Kapi', price: 30, icon: '☕', desc: 'Authentic South Indian frothy filter coffee', category: 'Beverages' },
    { id: 12, name: 'Masala Chaas', price: 25, icon: '🥛', desc: 'Cool buttermilk with cumin, mint, and sea salt', category: 'Beverages' },
    { id: 13, name: 'Quantum Cola', price: 40, icon: '🥤', desc: 'Ice-cold carbonated energy drink', category: 'Beverages' }
];

export default function StudentCanteen() {
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [cart, setCart] = useState([]);
    const [rfidStatus, setRfidStatus] = useState('idle'); // idle | scanning | success | failed
    const [lastReceipt, setLastReceipt] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [orderHistory, setOrderHistory] = useState([]);
    const receiptRef = useRef(null);

    useEffect(() => {
        const authUser = localStorage.getItem('sc_user');
        if (authUser) {
            const parsed = JSON.parse(authUser);
            setUser(parsed);
            fetch(`/api/students`).then(r => r.json()).then(data => {
                const me = data.students.find(s => s.id === parsed.id);
                if (me) {
                    setUser(me);
                    setBalance(me.wallet_balance || 0);
                }
            });
        }
        // Load order history from localStorage
        const saved = localStorage.getItem('sc_order_history');
        if (saved) setOrderHistory(JSON.parse(saved));
    }, []);

    const addToCart = (item) => {
        setCart([...cart, item]);
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    }

    const totalCost = cart.reduce((sum, item) => sum + item.price, 0);

    // Generate receipt data
    const generateReceipt = (items, total, newBal) => {
        const txnId = `TXN${Date.now().toString(36).toUpperCase()}`;
        const receipt = {
            txnId,
            studentName: user.name,
            studentId: user.id,
            items: items.map(i => ({ name: i.name, price: i.price, icon: i.icon })),
            totalAmount: total,
            newBalance: newBal,
            paymentMethod: 'Digital Wallet',
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
            time: new Date().toLocaleTimeString('en-IN'),
            timestamp: new Date().toISOString(),
        };
        return receipt;
    };

    // Download receipt as image
    const downloadReceipt = (receipt) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 500 + (receipt.items.length * 26);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header gradient
        const grad = ctx.createLinearGradient(0, 0, canvas.width, 80);
        grad.addColorStop(0, '#1a3a5c');
        grad.addColorStop(1, '#2d6a9f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, 80);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('🍔 PSR Campus Canteen', 24, 35);
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('Digital Payment Receipt', 24, 58);

        // Divider
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.moveTo(24, 95); ctx.lineTo(376, 95); ctx.stroke();

        let y = 120;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial';
        ctx.fillText('TRANSACTION ID', 24, y);
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(receipt.txnId, 24, y + 18);

        y += 44;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial';
        ctx.fillText('STUDENT', 24, y);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`${receipt.studentName} (${receipt.studentId})`, 24, y + 18);

        y += 44;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial';
        ctx.fillText('DATE & TIME', 24, y);
        ctx.fillStyle = '#fff';
        ctx.font = '13px Arial';
        ctx.fillText(`${receipt.date} at ${receipt.time}`, 24, y + 18);

        // Items
        y += 44;
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(376, y); ctx.stroke();
        y += 20;

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('ITEMS', 24, y);
        ctx.fillText('PRICE', 330, y);
        y += 20;

        receipt.items.forEach(item => {
            ctx.fillStyle = '#fff';
            ctx.font = '13px Arial';
            ctx.fillText(`${item.icon} ${item.name}`, 24, y);
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(`₹${item.price}`, 340, y);
            y += 26;
        });

        // Total
        y += 10;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(376, y); ctx.stroke();
        ctx.setLineDash([]);
        y += 26;

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('TOTAL PAID', 24, y);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`₹${receipt.totalAmount}`, 310, y);

        y += 36;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px Arial';
        ctx.fillText('Remaining Balance', 24, y);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`₹${receipt.newBalance}`, 330, y);

        // Footer
        y += 40;
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(376, y); ctx.stroke();
        y += 24;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('✅ Payment verified via PSR Campus Digital Wallet', 200, y);
        y += 18;
        ctx.fillText('Thank you for using PSR Campus Canteen', 200, y);

        // Download
        const link = document.createElement('a');
        link.download = `receipt_${receipt.txnId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // Send WhatsApp receipt
    const sendWhatsAppReceipt = async (receipt) => {
        if (!user?.phone) return;
        try {
            await fetch('/api/notifications/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'payment_receipt',
                    phone: user.phone,
                    data: {
                        studentName: receipt.studentName,
                        items: receipt.items,
                        totalAmount: receipt.totalAmount,
                        newBalance: receipt.newBalance,
                        txnId: receipt.txnId,
                    }
                }),
            });
        } catch (e) {
            console.warn('WhatsApp receipt failed:', e);
        }
    };

    const processPayment = async (paymentMethod) => {
        if (cart.length === 0) return;
        setRfidStatus('scanning');

        await new Promise(r => setTimeout(r, 1500));

        try {
            const res = await fetch('/api/esp32/rfid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hardware_id: 'Canteen_Terminal_1',
                    student_id: user.id,
                    rfid_uid: user.rfid_uid || paymentMethod,
                    action: 'canteen',
                    amount: totalCost
                })
            });

            const data = await res.json();

            if (data.success) {
                const newBal = balance - totalCost;
                setRfidStatus('success');
                setBalance(newBal);

                // Generate receipt
                const receipt = generateReceipt(cart, totalCost, newBal);
                setLastReceipt(receipt);

                // Save to history
                const newHistory = [receipt, ...orderHistory].slice(0, 20);
                setOrderHistory(newHistory);
                localStorage.setItem('sc_order_history', JSON.stringify(newHistory));

                // Send WhatsApp receipt
                sendWhatsAppReceipt(receipt);

                setTimeout(() => {
                    setCart([]);
                    setRfidStatus('idle');
                    setShowReceipt(true);
                }, 1500);
            } else {
                setRfidStatus('failed');
                alert("Hardware Response: " + (data.message || "Unknown error"));
                setTimeout(() => setRfidStatus('idle'), 2000);
            }
        } catch (err) {
            setRfidStatus('failed');
            setTimeout(() => setRfidStatus('idle'), 2000);
        }
    };

    const simulateRfidPayment = () => processPayment('RFID_Card');

    return (
        <DashboardLayout title="Cashless Canteen" breadcrumb="Campus Life">
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div className="page-header-left">
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>🍔 SAKEC Digital Cafeteria</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Tap your RFID Student Card at the counter for seamless deduction.</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {orderHistory.length > 0 && (
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => { setLastReceipt(orderHistory[0]); setShowReceipt(true); }}
                            style={{ fontSize: 12 }}
                        >
                            📜 Last Receipt
                        </button>
                    )}
                    <div style={{
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)',
                        padding: '12px 24px', borderRadius: 12, textAlign: 'right'
                    }}>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Digital Wallet</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>₹{balance}</div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes receiptSlideIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
            `}</style>

            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

                {/* Menu items grid */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {MENU_ITEMS.map(item => (
                        <div key={item.id} className="card" style={{ padding: 16, cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border)' }} onClick={() => addToCart(item)}>
                            <div style={{ fontSize: 42, marginBottom: 12, textAlign: 'center' }}>{item.icon}</div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>{item.name}</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', minHeight: 36 }}>{item.desc}</p>
                            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, padding: '2px 8px', background: 'var(--bg-card)', borderRadius: 4, fontWeight: 600 }}>{item.category}</span>
                                <span style={{ fontWeight: 800, color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>₹{item.price}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* POS Checkout Terminal */}
                <div className="card" style={{ width: 340, position: 'sticky', top: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🛒 Checkout Tray</h3>

                    <div style={{ minHeight: 200, maxHeight: 300, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: 13 }}>Tray is empty. Add food!</div>
                        ) : (
                            cart.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>{item.icon}</span>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{item.price}</span>
                                        <button onClick={() => removeFromCart(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 16, marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                            <span>Subtotal</span><span>₹{totalCost}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                            <span>Total Due</span><span style={{ color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>₹{totalCost}</span>
                        </div>
                    </div>

                    {rfidStatus === 'idle' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* RFID Card */}
                            <button
                                onClick={simulateRfidPayment}
                                disabled={cart.length === 0}
                                className={`btn ${cart.length > 0 ? 'btn-primary' : 'btn-outline'}`}
                                style={{ width: '100%', height: 48, fontSize: 14 }}
                            >
                                💳 Tap RFID Card to Pay
                            </button>

                            {/* ── Biometric divider ── */}
                            {user && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        🔐 BIOMETRIC PAY
                                    </span>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                </div>
                            )}

                            {/* ── Face Recognition ── */}
                            {user && <FacePayment
                                userId={user.id}
                                userName={user.name}
                                buttonText="Pay with Face Recognition"
                                disabled={cart.length === 0}
                                style={{ width: '100%', height: 48, fontSize: 13, justifyContent: 'center', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 8, color: '#a78bfa' }}
                                onSuccess={async (matchData) => {
                                    await processPayment('FaceAuth');
                                }}
                            />}

                            {/* ── Fingerprint ── */}
                            {user && <BiometricsManager
                                userId={user.id}
                                mode="authenticate"
                                buttonText="Pay with Fingerprint"
                                style={{ width: '100%', height: 48, fontSize: 13, justifyContent: 'center', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 8, color: '#34d399' }}
                                onSuccess={async (cred) => {
                                    await processPayment('FingerprintAuth');
                                }}
                            />}
                        </div>
                    )}

                    {rfidStatus === 'scanning' && (
                        <div style={{ textAlign: 'center', padding: '12px 0', background: 'rgba(59,130,246,0.1)', borderRadius: 8, border: '1px solid var(--color-blue)', color: 'var(--color-blue)', fontWeight: 600 }}>
                            <span style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', marginRight: 8 }}>📡</span>
                            Processing Payment...
                        </div>
                    )}

                    {rfidStatus === 'success' && (
                        <div style={{ textAlign: 'center', padding: '12px 0', background: 'rgba(16,185,129,0.1)', borderRadius: 8, border: '1px solid #10b981', color: '#10b981', fontWeight: 600 }}>
                            ✅ Payment Approved — Receipt Ready!
                        </div>
                    )}

                    {rfidStatus === 'failed' && (
                        <div style={{ textAlign: 'center', padding: '12px 0', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid #ef4444', color: '#ef4444', fontWeight: 600 }}>
                            ❌ Transaction Denied
                        </div>
                    )}
                </div>
            </div>

            {/* ── Order History ── */}
            {orderHistory.length > 0 && (
                <div className="card" style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                        📜 Recent Orders
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>{orderHistory.length} transactions</span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                        {orderHistory.map((order, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                                        {order.items.map(i => i.icon).join(' ')} {order.items.length} item{order.items.length > 1 ? 's' : ''}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {order.date} at {order.time} · {order.txnId}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontWeight: 800, color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>₹{order.totalAmount}</span>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                        onClick={() => { setLastReceipt(order); setShowReceipt(true); }}>📄 View</button>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                        onClick={() => downloadReceipt(order)}>⬇️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Receipt Modal ── */}
            {showReceipt && lastReceipt && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(5,12,30,0.92)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                }}>
                    <div ref={receiptRef} style={{
                        maxWidth: 420, width: '94%',
                        background: 'linear-gradient(180deg, #0f1a2e, #0a1628)',
                        border: '1px solid rgba(34,211,238,0.2)',
                        borderRadius: 20, overflow: 'hidden',
                        animation: 'receiptSlideIn 0.3s ease',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    }}>
                        {/* Receipt Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1a3a5c, #2d6a9f)',
                            padding: '20px 24px', textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4 }}>🍔 PSR Campus Canteen</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Digital Payment Receipt</div>
                        </div>

                        <div style={{ padding: '20px 24px' }}>
                            {/* Success badge */}
                            <div style={{
                                textAlign: 'center', marginBottom: 16, padding: '10px 0',
                                background: 'rgba(16,185,129,0.1)', borderRadius: 10,
                                border: '1px solid rgba(16,185,129,0.3)',
                            }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>✅ Payment Successful</span>
                            </div>

                            {/* Transaction Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Transaction ID</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>{lastReceipt.txnId}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Student</div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{lastReceipt.studentName}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Date</div>
                                    <div style={{ fontSize: 12, color: '#fff' }}>{lastReceipt.date}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Time</div>
                                    <div style={{ fontSize: 12, color: '#fff' }}>{lastReceipt.time}</div>
                                </div>
                            </div>

                            {/* Items */}
                            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 12, marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Items</div>
                                {lastReceipt.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                                        <span style={{ color: '#fff' }}>{item.icon} {item.name}</span>
                                        <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>₹{item.price}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                                    <span style={{ color: '#fff' }}>Total Paid</span>
                                    <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>₹{lastReceipt.totalAmount}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Remaining Balance</span>
                                    <span style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{lastReceipt.newBalance}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
                            <button className="btn btn-outline" onClick={() => setShowReceipt(false)} style={{ flex: 1 }}>
                                Close
                            </button>
                            <button className="btn btn-primary" onClick={() => downloadReceipt(lastReceipt)} style={{ flex: 1 }}>
                                ⬇️ Download Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
