// src/pages/admin/components/ActiveOrders.js
import React, { useState, useEffect, useCallback } from 'react';
import OrderCard from './OrderCard';
import './Orders.css';

const API = 'http://localhost:5000';


const TABS = [
  { key: 'admin_approved',      label: 'موافقة الأدمن',        icon: 'fa-user-check' },
  { key: 'supplier_approved',   label: 'موافقة السبلير',       icon: 'fa-handshake'  },
  { key: 'shipped',             label: 'جاري التوصيل',          icon: 'fa-truck'      },
  { key: 'customer_confirmed',  label: 'بينتظر تأكيد التسليم', icon: 'fa-clock'      }, // ← جديد
];

export default function ActiveOrders({ setView }) {
  const [activeTab, setActiveTab] = useState('admin_approved');
  const [orders, setOrders]       = useState([]);
  const [counts, setCounts]       = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── تحميل الطلبات حسب الـ status ───────────────────────────
  const fetchOrders = useCallback(async (status) => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/orders?status=${status}`, {
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

  // ── تحميل العدد لكل tab ─────────────────────────────────────
  const fetchCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const results = await Promise.all(
        TABS.map(t =>
          fetch(`${API}/api/orders?status=${t.key}&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json())
        )
      );
      const newCounts = {};
      TABS.forEach((t, i) => {
        newCounts[t.key] = results[i].total || results[i].length || 0;
      });
      setCounts(newCounts);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab, fetchOrders]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

 const handleMarkDelivered = async (order) => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/orders/deliver/${order.orderId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      showToast(`✅ تم تأكيد استلام الطلب #${order.orderId}`);
      fetchOrders(activeTab);
      fetchCounts();
    } else {
      const d = await res.json();
      setError(d.message || 'فشل التحديث');
    }
  } catch {
    setError('فشل الاتصال بالسيرفر');
  }
};
  // ── تحديث الحالة لـ shipped ─────────────────────────────────
  const handleMarkShipped = async (order) => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/orders/ship/${order.orderId}`, { // ✅ صلحنا الـ URL
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      showToast(`🚚 تم تحديث الطلب #${order.orderId} لـ "جاري التوصيل"`);
      fetchOrders(activeTab);
      fetchCounts();
    } else {
      const d = await res.json();
      setError(d.message || 'فشل التحديث');
    }
  } catch {
    setError('فشل الاتصال بالسيرفر');
  }
};

  return (
    <>
      <main className="ap-main">
        <header className="ap-header">
          <div>
            <h1 className="ap-title">
              <i className="fa-solid fa-list-check" style={{ color: '#3b82f6', marginLeft: 8 }}></i>
              الطلبات الجارية
            </h1>
            <p className="ap-subtitle">متابعة الطلبات بعد موافقة الأدمن</p>
          </div>
          <button className="ap-back-btn" onClick={() => setView({ name: 'pending-orders' })}>
            <i className="fa-solid fa-clock"></i> طلبات الانتظار
          </button>
        </header>

        {/* Tabs */}
        <div className="ord-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`ord-tab ${activeTab === tab.key ? 'ord-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className="ord-tab-count">{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

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
            <i className="fa-solid fa-box-open"></i>
            <p>مفيش طلبات في هذه المرحلة</p>
          </div>
        ) : (
          <div className="ord-grid">
  {orders.map(order => (
    <OrderCard
      key={order._id}
      order={order}
      showActions={activeTab === 'supplier_approved'}
      onApprove={handleMarkShipped}
      onReject={() => {}}
      onDeliver={activeTab === 'customer_confirmed' ? handleMarkDelivered : null}
    />
  ))}

          </div>
          
        )}
      </main>

      {toast && <div className="ep-toast">{toast}</div>}
    </>
  );
}
