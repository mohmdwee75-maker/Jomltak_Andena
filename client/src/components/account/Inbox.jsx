import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import './Inbox.css';

const API = 'http://localhost:5000';

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // ── جلب الرسائل القديمة ──
    fetch(`${API}/api/admin/inbox`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setMessages(d.messages || []); setLoading(false); })
      .catch(() => setLoading(false));

    // ── Socket ──
    const socket = io(API, {
      auth: { token },
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // رسالة جديدة من الأدمن
    socket.on('new_message', ({ message }) => {
      setMessages(prev => [...prev, message]);
    });

    // تأكيد إن رسالتك اتبعت
    socket.on('message_sent', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // حدد رسائل الأدمن كمقروءة
    socket.emit('mark_read', {});

    return () => socket.disconnect();
  }, []);

  // ── scroll للآخر دايماً ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim()) return;
    socketRef.current?.emit('customer_message', { text: text.trim() });
    setText('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return (
    <div className="chat-loading">
      <div className="chat-spinner" />
      <p>جاري التحميل...</p>
    </div>
  );

  return (
    <div className="chat-page">

      {/* ── Header ── */}
      <div className="chat-header">
        <div className="chat-header-avatar">
          <i className="fa-solid fa-shield-halved" />
        </div>
        <div style={{ flex: 1 }}>
          <p className="chat-header-name">إدارة جملتك عندنا</p>
          <p className="chat-header-status">
            <span className={`chat-status-dot ${connected ? 'online' : 'offline'}`} />
            {connected ? 'متصل' : 'غير متصل'}
          </p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <i className="fa-regular fa-comments" />
            <p>لا توجد رسائل بعد، ابدأ المحادثة!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.from === 'customer';
          return (
            <div key={i} className={`chat-bubble-wrap ${isMe ? 'mine' : 'theirs'}`}>
              {!isMe && (
                <div className="chat-bubble-avatar">
                  <i className="fa-solid fa-shield-halved" />
                </div>
              )}
              <div className={`chat-bubble ${isMe ? 'bubble-mine' : 'bubble-theirs'}`}>
                <p>{msg.text}</p>
                <span className="chat-time">{formatTime(msg.sentAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="chat-input-bar">
        <textarea
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="اكتب رسالتك... (Enter للإرسال)"
          className="chat-input"
        />
        <button onClick={sendMessage} className="chat-send-btn" disabled={!text.trim()}>
          <i className="fa-solid fa-paper-plane" />
        </button>
      </div>

    </div>
  );
}

const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';