'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BiometricsManager from '@/components/BiometricsManager';

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

    useEffect(() => {
        // Fetch current user from localDB using /api/students
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

    const simulateRfidPayment = async () => {
        if (cart.length === 0) return;
        setRfidStatus('scanning');
        
        // Wait 1.5s to simulate RFID tap delay
        await new Promise(r => setTimeout(r, 1500));

        try {
            // Hit the ESP32 hardware endpoint directly bypassing frontend restrictions
            const res = await fetch('/api/esp32/rfid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hardware_id: 'Canteen_Terminal_1',
                    rfid_uid: user.rfid_uid || 'Simulated_Tag_Fallback',
                    action: 'canteen',
                    amount: totalCost
                })
            });

            const data = await res.json();
            
            if (data.success) {
                setRfidStatus('success');
                setBalance(prev => prev - totalCost);
                setTimeout(() => {
                    setCart([]);
                    setRfidStatus('idle');
                }, 2000);
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

    return (
        <DashboardLayout title="Cashless Canteen" breadcrumb="Campus Life">
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div className="page-header-left">
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>🍔 SAKEC Digital Cafeteria</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Tap your RFID Student Card at the counter for seamless deduction.</p>
                </div>
                <div style={{
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)',
                    padding: '12px 24px', borderRadius: 12, textAlign: 'right'
                }}>
                    <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Digital Wallet</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>₹{balance}</div>
                </div>
            </div>

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
                            <button 
                                onClick={simulateRfidPayment} 
                                disabled={cart.length === 0}
                                className={`btn ${cart.length > 0 ? 'btn-primary' : 'btn-outline'}`} 
                                style={{ width: '100%', height: 48, fontSize: 14 }}
                            >
                                💳 Tap RFID Card to Pay
                            </button>
                            {user && <BiometricsManager 
                                userId={user.id} 
                                mode="authenticate" 
                                buttonText="Pay with Face ID / Fingerprint" 
                                style={{ width: '100%', height: 48, fontSize: 14, justifyContent: 'center' }}
                                onSuccess={async (cred) => {
                                    setRfidStatus('scanning');
                                    // Hit the endpoint to deduct the actual DB balance
                                    const res = await fetch('/api/esp32/rfid', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            hardware_id: 'Canteen_Terminal_1',
                                            student_id: user.id,
                                            rfid_uid: user.rfid_uid || 'Biometric_Auth',
                                            action: 'canteen',
                                            amount: totalCost
                                        })
                                    });
                                    const data = await res.json();
                                    
                                    if (data.success) {
                                        setRfidStatus('success');
                                        setBalance(prev => prev - totalCost);
                                        setTimeout(() => { setCart([]); setRfidStatus('idle'); }, 2000);
                                    } else {
                                        setRfidStatus('failed');
                                        alert("Payment Error: " + (data.message || "Insufficient balance or invalid auth"));
                                        setTimeout(() => setRfidStatus('idle'), 2000);
                                    }
                                }}
                            />}
                        </div>
                    )}

                    {rfidStatus === 'scanning' && (
                        <div style={{ textAlign: 'center', padding: '12px 0', background: 'rgba(59,130,246,0.1)', borderRadius: 8, border: '1px solid var(--color-blue)', color: 'var(--color-blue)', fontWeight: 600 }}>
                            <span style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', marginRight: 8 }}>📡</span>
                            Waiting for ESP32 Tag Scan...
                        </div>
                    )}

                    {rfidStatus === 'success' && (
                        <div style={{ textAlign: 'center', padding: '12px 0', background: 'rgba(16,185,129,0.1)', borderRadius: 8, border: '1px solid #10b981', color: '#10b981', fontWeight: 600 }}>
                            ✅ Payment Approved
                        </div>
                    )}

                    {rfidStatus === 'failed' && (
                        <div style={{ textAlign: 'center', padding: '12px 0', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid #ef4444', color: '#ef4444', fontWeight: 600 }}>
                            ❌ Transaction Denied
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
