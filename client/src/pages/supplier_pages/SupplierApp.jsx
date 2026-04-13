// src/pages/supplier_pages/SupplierApp.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SupplierApp.css';

const API = process.env.REACT_APP_API_URL || '';

const statusMap = {
  admin_approved:    { label: 'في انتظار موافقتك', color: 'sup-status-pending'   },
  supplier_approved: { label: 'تمت الموافقة',       color: 'sup-status-approved'  },
  shipped:           { label: 'جاري التوصيل',       color: 'sup-status-shipping'  },
  delivered:         { label: 'تم التسليم',          color: 'sup-status-delivered' },
  rejected:          { label: 'مرفوض',              color: 'sup-status-rejected'  },
};

const formatDate = (d) => d
  ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
  : '—';

const formatMoney = (n) =>
  Number(n || 0).toLocaleString('ar-EG') + ' ج.م';

// ─── token helper ──────────────────────────────────────────
const getToken = () => localStorage.getItem('token');
const getUser  = () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return {}; } };

// ══════════════════════════════════════════════════════════
//  Dashboard Tab
// ══════════════════════════════════════════════════════════
function DashboardTab() {
  const [months,  setMonths]  = useState(1);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/supplier/stats?months=${months}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [months]);

  const cards = stats ? [
    { icon: '📥', label: 'إجمالي الطلبات الواردة', value: stats.stats.totalIncoming,    color: '#1565C0' },
    { icon: '✅', label: 'تمت الموافقة عليها',     value: stats.stats.totalDelivered,   color: '#2E7D32' },
    { icon: '⏳', label: 'في انتظار موافقتك',      value: stats.stats.pendingApproval,  color: '#E65100' },
    { icon: '🚚', label: 'جاري التوصيل',           value: stats.stats.inProgress,       color: '#00695C' },
    { icon: '❌', label: 'طلبات مرفوضة',           value: stats.stats.rejected,         color: '#B71C1C' },
    { icon: '💰', label: 'إجمالي قيمة المُسلَّم',   value: formatMoney(stats.stats.totalRevenue), color: '#4527A0', big: true },
  ] : [];

  return (
    <div className="sup-dashboard">
      {/* ── فلتر الفترة ── */}
      <div className="sup-period-tabs">
        {[1, 2, 3].map(m => (
          <button
            key={m}
            className={`sup-period-btn ${months === m ? 'active' : ''}`}
            onClick={() => setMonths(m)}
          >
            {m === 1 ? 'آخر شهر' : m === 2 ? 'آخر شهرين' : 'آخر 3 شهور'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sup-loading">⏳ جاري تحميل الإحصائيات...</div>
      ) : !stats ? (
        <div className="sup-error">حدث خطأ في تحميل البيانات</div>
      ) : (
        <>
          {/* ── كروت الإحصائيات ── */}
          <div className="sup-stats-grid">
            {cards.map((c, i) => (
              <div key={i} className={`sup-stat-card ${c.big ? 'sup-stat-card--wide' : ''}`}
                   style={{ '--accent': c.color }}>
                <span className="sup-stat-icon">{c.icon}</span>
                <span className="sup-stat-value">{c.value}</span>
                <span className="sup-stat-label">{c.label}</span>
              </div>
            ))}
          </div>

          {/* ── نسبة التسليم ── */}
          <div className="sup-delivery-rate">
            <span className="sup-rate-label">نسبة التسليم</span>
            <div className="sup-rate-bar-wrap">
              <div
                className="sup-rate-bar-fill"
                style={{ width: stats.stats.deliveryRate }}
              />
            </div>
            <span className="sup-rate-value">{stats.stats.deliveryRate}</span>
          </div>

          {/* ── التقسيم الشهري ── */}
          {stats.monthlyBreakdown?.length > 0 && (
            <div className="sup-monthly">
              <h3 className="sup-section-title">تفاصيل شهرية</h3>
              <div className="sup-monthly-bars">
                {stats.monthlyBreakdown.map((m, i) => {
                  const max = Math.max(...stats.monthlyBreakdown.map(x => x.delivered), 1);
                  return (
                    <div key={i} className="sup-bar-item">
                      <div className="sup-bar-track">
                        <div
                          className="sup-bar-fill"
                          style={{ height: `${(m.delivered / max) * 100}%` }}
                        />
                      </div>
                      <span className="sup-bar-count">{m.delivered}</span>
                      <span className="sup-bar-month">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Orders Tab
// ══════════════════════════════════════════════════════════
function OrdersTab() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [acting,   setActing]   = useState(null); // orderId جاري التنفيذ عليه

  useEffect(() => {
    fetch(`${API}/api/supplier/orders`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDecision = async (orderId, approved) => {
    const deliveryDate = approved
      ? prompt('أدخل تاريخ التسليم المتوقع (مثال: 2025-06-30) — اتركه فارغاً للتخطي')
      : null;

    setActing(orderId);
    try {
      const res = await fetch(`${API}/api/orders/supplier-approve/${orderId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ approved, deliveryDate: deliveryDate || null, notes: '' }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(prev => prev.map(o =>
          o.orderId === orderId ? { ...o, status: approved ? 'supplier_approved' : 'rejected' } : o
        ));
        setExpanded(null);
      } else {
        alert(data.message || 'حدث خطأ');
      }
    } catch {
      alert('تعذر الاتصال بالسيرفر');
    } finally {
      setActing(null);
    }
  };

  const filterOptions = [
    { key: 'all',              label: 'الكل' },
    { key: 'admin_approved',   label: 'في الانتظار' },
    { key: 'supplier_approved',label: 'موافق عليها' },
    { key: 'shipped',          label: 'جاري التوصيل' },
    { key: 'delivered',        label: 'مُسلَّمة' },
    { key: 'rejected',         label: 'مرفوضة' },
  ];

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="sup-loading">⏳ جاري تحميل الطلبات...</div>;

  return (
    <div className="sup-orders">
      {/* ── فلاتر ── */}
      <div className="sup-filter-bar">
        {filterOptions.map(f => (
          <button
            key={f.key}
            className={`sup-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="sup-filter-count">
                {orders.filter(o => o.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="sup-empty">
          <span>📭</span>
          <p>لا يوجد طلبات في هذا التصنيف</p>
        </div>
      ) : (
        <div className="sup-orders-list">
          {filtered.map(order => {
            const st      = statusMap[order.status] || { label: order.status, color: '' };
            const isOpen  = expanded === order.orderId;
            const pending = order.status === 'admin_approved';
            const customer = order.customer_id;

            return (
              <div key={order.orderId} className={`sup-order-card ${pending ? 'sup-order-card--pending' : ''}`}>

                {/* ── رأس الكارت ── */}
                <div className="sup-order-header" onClick={() =>
                  setExpanded(isOpen ? null : order.orderId)}>

                  <div className="sup-order-meta">
                    {pending && <span className="sup-urgent-badge">🔔 يحتاج موافقتك</span>}
                    <span className="sup-order-id">طلب #{order.orderId}</span>
                    <span className="sup-order-date">{formatDate(order.createdAt)}</span>
                  </div>

                  <div className="sup-order-center">
                    <span className="sup-order-items">
                      {order.items?.length} منتج — {order.items?.reduce((s, i) => s + i.quantity, 0)} قطعة
                    </span>
                    {customer && (
                      <span className="sup-order-customer">
                        👤 {customer.F_name} {customer.L_name}
                      </span>
                    )}
                  </div>

                  <div className="sup-order-right">
                    <span className="sup-order-total">{formatMoney(order.totalPrice)}</span>
                    <span className={`sup-status-badge ${st.color}`}>{st.label}</span>
                    <span className="sup-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* ── تفاصيل ── */}
                {isOpen && (
                  <div className="sup-order-details">

                    {/* المنتجات */}
                    <div className="sup-detail-section">
                      <h4 className="sup-detail-title">📦 المنتجات</h4>
                      {order.items?.map((item, i) => (
                        <div key={i} className="sup-item-row">
                          {item.image
                            ? <img src={item.image} alt={item.name} className="sup-item-img" />
                            : <div className="sup-item-img-ph">🛍️</div>
                          }
                          <div className="sup-item-info">
                            <span className="sup-item-name">{item.name}</span>
                            <span className="sup-item-meta">
                              {item.quantity} قطعة × {formatMoney(item.price)}
                            </span>
                          </div>
                          <span className="sup-item-sub">{formatMoney(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {/* بيانات التوصيل */}
                    <div className="sup-detail-section">
                      <h4 className="sup-detail-title">📍 بيانات التوصيل</h4>
                      {[
                        ['الاسم',       order.deliveryInfo?.fullName],
                        ['التليفون',    order.deliveryInfo?.phone],
                        ['العنوان',     order.deliveryInfo?.address],
                        ['المدينة',     order.deliveryInfo?.city],
                        ['المحافظة',    order.deliveryInfo?.governorate],
                        ['تاريخ الطلب', formatDate(order.deliveryInfo?.requestedDate)],
                      ].map(([k, v]) => (
                        <div key={k} className="sup-info-row">
                          <span className="sup-info-key">{k}</span>
                          <span className="sup-info-val">{v || '—'}</span>
                        </div>
                      ))}
                    </div>

                    {/* الإجمالي */}
                    <div className="sup-order-total-row">
                      <span>الإجمالي</span>
                      <span className="sup-total-val">{formatMoney(order.totalPrice)}</span>
                    </div>

                    {/* أزرار الموافقة / الرفض */}
                    {pending && (
                      <div className="sup-action-btns">
                        <button
                          className="sup-btn-approve"
                          disabled={acting === order.orderId}
                          onClick={() => handleDecision(order.orderId, true)}
                        >
                          {acting === order.orderId ? '⏳ جاري...' : '✅ موافقة وتحديد موعد التسليم'}
                        </button>
                        <button
                          className="sup-btn-reject"
                          disabled={acting === order.orderId}
                          onClick={() => handleDecision(order.orderId, false)}
                        >
                          ❌ رفض الطلب
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  SupplierApp — الـ Shell الرئيسي
// ══════════════════════════════════════════════════════════
export default function SupplierApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate('/sign-in');
  };

  const tabs = [
    { key: 'dashboard', icon: '📊', label: 'لوحة التحكم' },
    { key: 'orders',    icon: '📦', label: 'الطلبات' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'orders':    return <OrdersTab />;
      default: return null;
    }
  };

  return (
    <div className="sup-container">

      {/* ── Sidebar ── */}
      <aside className="sup-sidebar">
        <div className="sup-sidebar-top">
          <div className="sup-avatar">🏭</div>
          <h3 className="sup-name">{user?.name || 'المورد'}</h3>
          {user?.company && <p className="sup-company">{user.company}</p>}
        </div>

        <nav className="sup-nav">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`sup-nav-item ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span className="sup-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <button className="sup-logout-btn" onClick={handleLogout}>
          🚪 تسجيل الخروج
        </button>
      </aside>

      {/* ── Content ── */}
      <main className="sup-main">
        <div className="sup-topbar">
          <h1 className="sup-page-title">
            {tabs.find(t => t.key === activeTab)?.icon}{' '}
            {tabs.find(t => t.key === activeTab)?.label}
          </h1>
        </div>
        <div className="sup-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
