// src/pages/admin/components/PendingOrders.js
import React, { useState, useEffect, useCallback } from 'react';
import OrderCard from './OrderCard';
import './Orders.css';

const API = process.env.REACT_APP_API_URL || '';

// ── Reject Modal ────────────────────────────────────────────────
const RejectModal = ({ order, onConfirm, onCancel, loading }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="ord-modal-overlay" onClick={onCancel}>
      <div className="ord-modal" onClick={e => e.stopPropagation()}>
        <div className="ord-modal-icon ord-modal-icon-danger">
          <i className="fa-solid fa-circle-xmark"></i>
        </div>
        <h3>رفض الطلب #{order.orderId}</h3>
        <p>هتبعت إشعار للعميل بالرفض</p>
        <div className="ap-field" style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>سبب الرفض</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="اكتب سبب الرفض للعميل..."
            rows={3}
            style={{ width: '100%', fontFamily: 'Cairo, sans-serif', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', resize: 'vertical', marginTop: 6, fontSize: 14 }}
          />
        </div>
        <div className="ord-modal-actions">
          <button className="ep-modal-cancel" onClick={onCancel}>إلغاء</button>
          <button
            className="ep-modal-confirm"
            onClick={() => onConfirm(reason)}
            disabled={loading || !reason.trim()}
          >
            {loading ? <><span className="ep-spinner"></span> جاري الرفض...</> : 'تأكيد الرفض'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main ────────────────────────────────────────────────────────
export default function PendingOrders({ setView }) {
  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [toast, setToast]                 = useState('');
  const [rejectTarget, setRejectTarget]   = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchPending = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/orders?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      setOrders(data.orders || data || []);
    } catch {
      setError('فشل تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // ── قبول الطلب ─────────────────────────────────────────────
  const handleApprove = async (order) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/orders/admin-approve/${order.orderId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true, notes: '' }),
      });
      if (res.ok) {
        showToast(`✅ تم قبول الطلب #${order.orderId}`);
        fetchPending();
      } else {
        const d = await res.json();
        setError(d.message || 'فشل القبول');
      }
    } catch {
      setError('فشل الاتصال بالسيرفر');
    } finally {
      setActionLoading(false);
    }
  };

  // ── رفض الطلب ──────────────────────────────────────────────
  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/orders/admin-approve/${rejectTarget.orderId}`, {  // ← rejectTarget مش order
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false, reason }),
      });
      if (res.ok) {
        showToast(`🚫 تم رفض الطلب #${rejectTarget.orderId}`);
        setRejectTarget(null);
        fetchPending();
      } else {
        const d = await res.json();
        setError(d.message || 'فشل الرفض');
        setRejectTarget(null);
      }
    } catch {
      setError('فشل الاتصال بالسيرفر');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <main className="ap-main">
        <header className="ap-header">
          <div>
            <h1 className="ap-title">
              <i className="fa-solid fa-clock" style={{ color: '#f59e0b', marginLeft: 8 }}></i>
              طلبات في الانتظار
            </h1>
            <p className="ap-subtitle">{orders.length} طلب ينتظر موافقتك</p>
          </div>
          <button className="ap-back-btn" onClick={() => setView({ name: 'active-orders' })}>
            <i className="fa-solid fa-list-check"></i> الطلبات الجارية
          </button>
        </header>

        {error && (
          <div className="ap-alert ap-alert-error">
            <i className="fa-solid fa-triangle-exclamation"></i> {error}
          </div>
        )}

        {loading ? (
          <div className="ep-loading">
            <span className="ep-spinner-lg"></span>
            <p>جاري تحميل الطلبات...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="ep-empty">
            <i className="fa-solid fa-check-circle" style={{ color: '#10b981' }}></i>
            <p>مفيش طلبات في الانتظار — كل حاجة اتعملت!</p>
          </div>
        ) : (
          <div className="ord-grid">
            {orders.map(order => (
              <OrderCard
                key={order._id}
                order={order}
                onApprove={handleApprove}
                onReject={setRejectTarget}
                showActions={true}
              />
            ))}
          </div>
        )}
      </main>

      {rejectTarget && (
        <RejectModal
          order={rejectTarget}
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(null)}
          loading={actionLoading}
        />
      )}

      {toast && <div className="ep-toast">{toast}</div>}
    </>
  );
}