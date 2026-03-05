// src/pages/admin/components/Customers.js
import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function getToken() {
    return localStorage.getItem('token') || '';
}

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [modal, setModal]         = useState(null);
    const [banDays, setBanDays]     = useState(1);
    const [msgText, setMsgText]     = useState('');
    const [adminForm, setAdminForm] = useState({ name:'', email:'', password:'', phone:'' });
    const [feedback, setFeedback]   = useState('');

    useEffect(() => {
        fetch(`${API}/api/admin/customers`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        })
        .then(r => r.json())
        .then(d => { setCustomers(d.customers || []); setLoading(false); })
        .catch(() => setLoading(false));
    }, []);

    const showFeedback = (msg) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(''), 3000);
    };

    const handleDelete = async (customer) => {
        if (!window.confirm(`هتحذف ${customer.F_name}؟`)) return;
        const res = await fetch(`${API}/api/admin/customers/${customer.user_ID}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (res.ok) {
            setCustomers(prev => prev.filter(c => c.user_ID !== customer.user_ID));
            showFeedback('✅ تم حذف العميل');
        }
    };

    const handleBan = async () => {
        const res = await fetch(`${API}/api/admin/customers/${modal.customer.user_ID}/ban`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ days: banDays })
        });
        const data = await res.json();
        if (data.success) {
            setCustomers(prev => prev.map(c => c.user_ID === modal.customer.user_ID ? data.customer : c));
            setModal(null);
            showFeedback(`🚫 تم الباند لمدة ${banDays} يوم`);
        }
    };

    const handleUnban = async (customer) => {
        const res = await fetch(`${API}/api/admin/customers/${customer.user_ID}/ban`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ days: 0 })
        });
        const data = await res.json();
        if (data.success) {
            setCustomers(prev => prev.map(c => c.user_ID === customer.user_ID ? data.customer : c));
            showFeedback('✅ تم رفع الباند');
        }
    };

    const handleSendMessage = async () => {
        if (!msgText.trim()) return;
        const res = await fetch(`${API}/api/admin/customers/${modal.customer.user_ID}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ text: msgText })
        });
        const data = await res.json();
        if (data.success) { setModal(null); setMsgText(''); showFeedback('✉️ تم إرسال الرسالة'); }
    };

    const handleAddAdmin = async () => {
        const { name, email, password } = adminForm;
        if (!name || !email || !password) return showFeedback('❌ ملأ كل الحقول');
        const res = await fetch(`${API}/api/admin/add-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(adminForm)
        });
        const data = await res.json();
        if (data.success) {
            setModal(null);
            setAdminForm({ name:'', email:'', password:'', phone:'' });
            showFeedback('✅ تم إضافة الأدمن');
        } else {
            showFeedback('❌ ' + data.message);
        }
    };

    const filtered = customers.filter(c =>
        `${c.F_name} ${c.L_name} ${c.User_name} ${c.Phone}`.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="ep-loading">
            <span className="ep-spinner-lg" />
            <span>جاري تحميل العملاء...</span>
        </div>
    );

    return (
        <div style={pageStyle}>

            {/* ── Header ── */}
            <div style={headerStyle}>
                <h2 style={titleStyle}>
                    <i className="fa-solid fa-users" style={{ color:'#176FCA', marginLeft:10 }} />
                    إدارة العملاء
                    <span style={countBadge}>{customers.length}</span>
                </h2>
                <button onClick={() => setModal({ type:'add-admin' })} style={primaryBtn}>
                    <i className="fa-solid fa-user-plus" /> إضافة أدمن
                </button>
            </div>

            {/* ── Feedback ── */}
            {feedback && (
                <div style={feedbackStyle}>{feedback}</div>
            )}

            {/* ── Search ── */}
            <div style={searchWrapper}>
                <i className="fa-solid fa-magnifying-glass" style={searchIcon} />
                <input
                    placeholder="ابحث باسم أو يوزر أو تليفون..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={searchInput}
                />
            </div>

            {/* ── Table ── */}
            <div style={tableWrapper}>
                <table style={tableStyle}>
                    <thead>
                        <tr style={theadRow}>
                            {['#','الاسم','اليوزر','التليفون','المدينة','الطلبات','الحالة','إجراءات'].map(h => (
                                <th key={h} style={th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((c) => (
                            <tr key={c._id} style={{ ...trStyle, background: c.isBanned ? '#fff5f5' : 'white' }}>
                                <td style={{ ...td, color:'#94a3b8', fontWeight:600 }}>{c.user_ID}</td>
                                <td style={{ ...td, fontWeight:600 }}>{c.F_name} {c.L_name}</td>
                                <td style={{ ...td, color:'#64748b' }}>{c.User_name || '—'}</td>
                                <td style={td}>{c.Phone}</td>
                                <td style={td}>{c.city || '—'}</td>
                                <td style={{ ...td, textAlign:'center' }}>{c.order_count || 0}</td>
                                <td style={td}>
                                    <span style={c.isBanned ? bannedBadge : activeBadge}>
                                        {c.isBanned ? '🚫 محظور' : '✅ نشط'}
                                    </span>
                                </td>
                                <td style={td}>
                                    <div style={actionsDiv}>
                                        {c.isBanned
                                            ? <button onClick={() => handleUnban(c)} style={actionBtn('#16a34a')}>
                                                <i className="fa-solid fa-unlock" /> رفع الباند
                                              </button>
                                            : <button onClick={() => { setModal({ type:'ban', customer:c }); setBanDays(1); }}
                                                style={actionBtn('#f59e0b')}>
                                                <i className="fa-solid fa-ban" /> باند
                                              </button>
                                        }
                                        <button onClick={() => { setModal({ type:'message', customer:c }); setMsgText(''); }}
                                            style={actionBtn('#176FCA')}>
                                            <i className="fa-solid fa-envelope" /> رسالة
                                        </button>
                                        <button onClick={() => handleDelete(c)} style={actionBtn('#e74c3c')}>
                                            <i className="fa-solid fa-trash" /> حذف
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={8} style={emptyCell}>
                                    <i className="fa-solid fa-users-slash" style={{ fontSize:32, color:'#cbd5e1', display:'block', marginBottom:8 }} />
                                    لا يوجد عملاء
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ══ Modals ══ */}
            {modal && (
                <div style={overlay} onClick={() => setModal(null)}>
                    <div style={modalBox} onClick={e => e.stopPropagation()}>

                        {/* باند */}
                        {modal.type === 'ban' && <>
                            <div style={modalHeader}>
                                <span style={modalIcon}>🚫</span>
                                <h3 style={modalTitle}>باند العميل</h3>
                            </div>
                            <p style={modalSub}>
                                العميل: <strong>{modal.customer.F_name} {modal.customer.L_name}</strong>
                            </p>
                            <label style={label}>عدد الأيام</label>
                            <input type="number" min={1} value={banDays}
                                onChange={e => setBanDays(Number(e.target.value))}
                                style={modalInput} />
                            <div style={modalFooter}>
                                <button onClick={handleBan} style={primaryBtn}>تأكيد الباند</button>
                                <button onClick={() => setModal(null)} style={ghostBtn}>إلغاء</button>
                            </div>
                        </>}

                        {/* رسالة */}
                        {modal.type === 'message' && <>
                            <div style={modalHeader}>
                                <span style={modalIcon}>✉️</span>
                                <h3 style={modalTitle}>إرسال رسالة</h3>
                            </div>
                            <p style={modalSub}>
                                إلى: <strong>{modal.customer.F_name} {modal.customer.L_name}</strong>
                            </p>
                            <label style={label}>نص الرسالة</label>
                            <textarea rows={4} value={msgText}
                                onChange={e => setMsgText(e.target.value)}
                                placeholder="اكتب رسالتك هنا..."
                                style={{ ...modalInput, resize:'vertical' }} />
                            <div style={modalFooter}>
                                <button onClick={handleSendMessage} style={primaryBtn}>إرسال</button>
                                <button onClick={() => setModal(null)} style={ghostBtn}>إلغاء</button>
                            </div>
                        </>}

                        {/* إضافة أدمن */}
                        {modal.type === 'add-admin' && <>
                            <div style={modalHeader}>
                                <span style={modalIcon}>👤</span>
                                <h3 style={modalTitle}>إضافة أدمن جديد</h3>
                            </div>
                            {[
                                { key:'name',     label:'الاسم',         type:'text'     },
                                { key:'email',    label:'الإيميل',       type:'email'    },
                                { key:'password', label:'كلمة المرور',   type:'password' },
                                { key:'phone',    label:'التليفون',      type:'text'     },
                            ].map(f => (
                                <div key={f.key} style={{ marginBottom:14 }}>
                                    <label style={label}>{f.label}</label>
                                    <input
                                        type={f.type}
                                        value={adminForm[f.key]}
                                        onChange={e => setAdminForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        style={modalInput}
                                    />
                                </div>
                            ))}
                            <div style={modalFooter}>
                                <button onClick={handleAddAdmin} style={primaryBtn}>إضافة</button>
                                <button onClick={() => setModal(null)} style={ghostBtn}>إلغاء</button>
                            </div>
                        </>}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════
//  Styles
// ═══════════════════════════════════════
const font = 'Cairo, sans-serif';

const pageStyle   = { padding:'28px 24px', fontFamily:font, direction:'rtl', minHeight:'100vh', background:'#f8fafc' };
const headerStyle = { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 };
const titleStyle  = { margin:0, fontSize:22, fontWeight:800, color:'#1e293b', display:'flex', alignItems:'center', gap:8 };
const countBadge  = { background:'#eff6ff', color:'#176FCA', borderRadius:20, padding:'2px 10px', fontSize:13, fontWeight:700 };

const feedbackStyle = {
    background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10,
    padding:'10px 16px', marginBottom:16, color:'#166534',
    fontWeight:600, fontFamily:font
};

const searchWrapper = { position:'relative', marginBottom:16 };
const searchIcon    = { position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:14 };
const searchInput   = {
    width:'100%', padding:'10px 38px 10px 14px', border:'1px solid #e2e8f0',
    borderRadius:10, fontSize:14, fontFamily:font, direction:'rtl',
    boxSizing:'border-box', outline:'none', background:'white'
};

const tableWrapper = { borderRadius:14, overflow:'hidden', boxShadow:'0 1px 8px rgba(0,0,0,0.08)', background:'white' };
const tableStyle   = { width:'100%', borderCollapse:'collapse' };
const theadRow     = { background:'#f1f5f9', borderBottom:'2px solid #e2e8f0' };
const th           = { padding:'12px 14px', textAlign:'right', fontSize:12, fontWeight:700, color:'#64748b', whiteSpace:'nowrap' };
const trStyle      = { borderBottom:'1px solid #f1f5f9', transition:'background 0.15s' };
const td           = { padding:'11px 14px', fontSize:13, color:'#334155', verticalAlign:'middle' };
const emptyCell    = { textAlign:'center', padding:'50px 20px', color:'#94a3b8', fontSize:14, fontFamily:font };

const actionsDiv   = { display:'flex', gap:6, alignItems:'center' };

const activeBadge  = { background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' };
const bannedBadge  = { background:'#fee2e2', color:'#dc2626', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' };

const actionBtn = (bg) => ({
    background: bg, color:'white', border:'none', borderRadius:7,
    padding:'5px 10px', fontSize:11, fontWeight:700, fontFamily:font,
    cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4,
    whiteSpace:'nowrap'
});

const primaryBtn = {
    background:'#176FCA', color:'white', border:'none', borderRadius:9,
    padding:'9px 20px', fontSize:14, fontWeight:700, fontFamily:font,
    cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6
};
const ghostBtn = {
    background:'#f1f5f9', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:9,
    padding:'9px 20px', fontSize:14, fontWeight:700, fontFamily:font, cursor:'pointer'
};

const overlay   = { position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 };
const modalBox  = { background:'white', borderRadius:18, padding:'28px 30px', width:'90%', maxWidth:440, direction:'rtl', fontFamily:font, boxShadow:'0 20px 60px rgba(0,0,0,0.15)' };
const modalHeader = { display:'flex', alignItems:'center', gap:10, marginBottom:16 };
const modalIcon   = { fontSize:22 };
const modalTitle  = { margin:0, fontSize:18, fontWeight:800, color:'#1e293b' };
const modalSub    = { color:'#64748b', fontSize:13, marginBottom:16 };
const label       = { display:'block', fontSize:12, fontWeight:700, color:'#64748b', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' };
const modalInput  = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, fontFamily:font, direction:'rtl', boxSizing:'border-box', outline:'none' };
const modalFooter = { display:'flex', gap:10, marginTop:20 };