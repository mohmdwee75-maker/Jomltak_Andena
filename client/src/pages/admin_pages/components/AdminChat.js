import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API = 'http://localhost:5000';

export default function AdminChat() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // ── جلب العملاء اللي عندهم رسائل ──
    fetch(`${API}/api/admin/customers`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setCustomers(d.customers || []));

    // ── Socket ──
    const socket = io(API, {
      auth: { token },
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // رسالة جديدة من عميل
    socket.on('new_message', ({ customerId, message }) => {
      // لو المحادثة دي مفتوحة، أضيف الرسالة
      setSelected(prev => {
        if (prev?._id === customerId) {
          setMessages(m => [...m, message]);
        }
        return prev;
      });
      // زوّد عداد الغير مقروء
      setCustomers(prev => prev.map(c =>
        c._id === customerId
          ? { ...c, _unread: (c._unread || 0) + 1 }
          : c
      ));
    });

    // تأكيد إن رسالة الأدمن اتبعت
    socket.on('message_sent', ({ message }) => {
      setMessages(prev => [...prev, message]);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = (customer) => {
    setSelected(customer);
    setMessages(customer.messages || []);
    // صفّر العداد
    setCustomers(prev => prev.map(c =>
      c._id === customer._id ? { ...c, _unread: 0 } : c
    ));
    socketRef.current?.emit('mark_read', { customerId: customer._id });
  };

  const sendMessage = () => {
    if (!text.trim() || !selected) return;
    socketRef.current?.emit('admin_message', {
      customerId: selected._id,
      text: text.trim()
    });
    setText('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // العملاء اللي عندهم رسائل أو unread
  const chatCustomers = customers.filter(c =>
    (c.messages?.length || 0) > 0 || c._unread > 0
  );

  return (
    <div style={rootStyle}>

      {/* ══ قائمة العملاء ══ */}
      <div style={listPanel}>
        <div style={listHeaderStyle}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>المحادثات</span>
          <span style={{ ...statusDot, background: connected ? '#22c55e' : '#94a3b8' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chatCustomers.length === 0 && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 24 }}>
              لا توجد محادثات بعد
            </p>
          )}
          {chatCustomers.map(c => {
            const lastMsg = c.messages?.[c.messages.length - 1];
            const unread  = c._unread || 0;
            const isOpen  = selected?._id === c._id;
            return (
              <div key={c._id} onClick={() => openChat(c)}
                style={{ ...listItemStyle, background: isOpen ? '#eff6ff' : 'white' }}>
                <div style={avatarStyle}>
                  {c.F_name?.[0]}{c.L_name?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                    {c.F_name} {c.L_name}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastMsg?.text || ''}
                  </p>
                </div>
                {unread > 0 && (
                  <span style={unreadStyle}>{unread}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ نافذة الشات ══ */}
      <div style={chatPanel}>
        {selected ? <>

          {/* Header */}
          <div style={chatHeaderStyle}>
            <div style={chatAvatarStyle}>
              {selected.F_name?.[0]}{selected.L_name?.[0]}
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                {selected.F_name} {selected.L_name}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{selected.Phone}</p>
            </div>
          </div>

          {/* Messages */}
          <div style={messagesStyle}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 10 }}>
                <i className="fa-regular fa-comments" style={{ fontSize: 40 }} />
                <p style={{ fontSize: 13 }}>لا توجد رسائل بعد</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isAdmin = msg.from === 'admin';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end', marginBottom: 6 }}>
                  <div style={isAdmin ? adminBubbleStyle : customerBubbleStyle}>
                    <p style={{ margin: '0 0 3px', fontSize: 14, wordBreak: 'break-word' }}>{msg.text}</p>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>{formatTime(msg.sentAt)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={inputBarStyle}>
            <textarea
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="اكتب ردك... (Enter للإرسال)"
              style={inputStyle}
            />
            <button onClick={sendMessage} disabled={!text.trim()} style={sendBtnStyle}>
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>

        </> : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 12 }}>
            <i className="fa-regular fa-comments" style={{ fontSize: 52 }} />
            <p style={{ fontSize: 14, fontFamily: 'Cairo' }}>اختر محادثة لبدء الرد</p>
          </div>
        )}
      </div>
    </div>
  );
}

const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';

// ── Styles ──────────────────────────────────────────────
const font = 'Cairo, sans-serif';

const rootStyle = { display:'flex', width:'100%', height:'calc(100vh - 180px)', minHeight:500, background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,0.08)', fontFamily:font, direction:'rtl' };
const listPanel       = { width:270, borderLeft:'1px solid #f1f5f9', display:'flex', flexDirection:'column', flexShrink:0 };
const listHeaderStyle = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'1px solid #f1f5f9' };
const statusDot       = { display:'inline-block', width:8, height:8, borderRadius:'50%' };
const listItemStyle   = { display:'flex', alignItems:'center', gap:10, padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid #f8fafc', transition:'background 0.15s' };
const avatarStyle     = { width:38, height:38, background:'linear-gradient(135deg,#306591,#176FCA)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, fontWeight:700, flexShrink:0 };
const unreadStyle     = { background:'#176FCA', color:'white', borderRadius:20, padding:'2px 7px', fontSize:10, fontWeight:700, flexShrink:0 };
const chatPanel       = { flex:1, display:'flex', flexDirection:'column', background:'#f8fafc' };
const chatHeaderStyle = { display:'flex', alignItems:'center', gap:14, padding:'14px 20px', background:'white', borderBottom:'1px solid #f1f5f9', flexShrink:0 };
const chatAvatarStyle = { width:42, height:42, background:'linear-gradient(135deg,#306591,#176FCA)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:15, fontWeight:700 };
const messagesStyle   = { flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:4 };
const adminBubbleStyle    = { background:'white', color:'#1e293b', padding:'9px 14px', borderRadius:'16px 16px 16px 4px', maxWidth:'65%', boxShadow:'0 1px 4px rgba(0,0,0,0.07)' };
const customerBubbleStyle = { background:'#176FCA', color:'white', padding:'9px 14px', borderRadius:'16px 16px 4px 16px', maxWidth:'65%' };
const inputBarStyle   = { display:'flex', alignItems:'flex-end', gap:10, padding:'12px 16px', background:'white', borderTop:'1px solid #f1f5f9', flexShrink:0 };
const inputStyle      = { flex:1, padding:'9px 14px', border:'1.5px solid #e2e8f0', borderRadius:22, fontSize:14, fontFamily:font, direction:'rtl', resize:'none', outline:'none', maxHeight:100, lineHeight:1.5 };
const sendBtnStyle    = { width:40, height:40, background:'#176FCA', color:'white', border:'none', borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0, transition:'background 0.2s' };