// src/pages/supplier_pages/SupplierDashboard.jsx
import { useState, useEffect } from 'react';
import './SupplierDashboard.css';
import HeroSection from '../../components/HeroSection.module';
import Footer from '../../components/Footer.module';
import ScrollToTop from '../../components/ScrollToTop.module';

const API = 'http://localhost:5000';
const token = () => localStorage.getItem('token');

// ══════════════════════════════════════════════════
//  Sidebar
// ══════════════════════════════════════════════════
function SupplierSidebar({ view, setView, supplier, onLogout }) {
  const navItems = [
    { key: 'orders',   icon: '📦', label: 'الطلبات الواردة' },
    { key: 'financial', icon: '💰', label: 'السجل المالي'  },
    { key: 'settings', icon: '⚙️', label: 'إعدادات الحساب' },
  ];

  return (
    <aside className="sd-sidebar">
      <div className="sd-sidebar-brand">
        <div className="sd-avatar">{supplier?.name?.[0] || '🏭'}</div>
        <div>
          <p className="sd-brand-name">{supplier?.name || 'المورد'}</p>
          <p className="sd-brand-company">{supplier?.company || 'مورد معتمد'}</p>
        </div>
      </div>

      <nav className="sd-nav">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`sd-nav-item ${view === item.key ? 'sd-nav-active' : ''}`}
            onClick={() => setView(item.key)}
          >
            <span className="sd-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="sd-logout" onClick={onLogout}>
        🚪 تسجيل الخروج
      </button>
    </aside>
  );
}

// ══════════════════════════════════════════════════
//  Orders View
// ══════════════════════════════════════════════════
const STATUS_LABELS = {
  admin_approved:    { label: 'بانتظار القبول', color: '#F59E0B', bg: '#FFFBEB' },
  supplier_approved: { label: 'مقبول',          color: '#10B981', bg: '#ECFDF5' },
  shipped:           { label: 'تم الشحن',       color: '#3B82F6', bg: '#EFF6FF' },
  delivered:         { label: 'تم التسليم',     color: '#6B7280', bg: '#F9FAFB' },
  rejected:          { label: 'مرفوض',          color: '#EF4444', bg: '#FEF2F2' },
};

function OrdersView() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [selected, setSelected] = useState(null);
  const [actLoading, setActLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? `${API}/api/supplier/orders`
        : `${API}/api/supplier/orders?status=${filter}`;
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const handleAction = async (orderId, action) => {
    setActLoading(true);
    try {
      const res = await fetch(`${API}/api/supplier/orders/${orderId}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) { setSelected(null); fetchOrders(); }
    } catch {}
    finally { setActLoading(false); }
  };

  const filters = [
    { key: 'all',              label: 'الكل' },
    { key: 'admin_approved',   label: 'انتظار القبول' },
    { key: 'supplier_approved', label: 'مقبول' },
    { key: 'shipped',          label: 'تم الشحن' },
    { key: 'delivered',        label: 'تم التسليم' },
    { key: 'rejected',         label: 'مرفوض' },
  ];

  return (
    <div className="sd-section">
      <div className="sd-section-header">
        <h2 className="sd-section-title">📦 الطلبات الواردة</h2>
        <span className="sd-count">{orders.length} طلب</span>
      </div>

      {/* Filter Tabs */}
      <div className="sd-tabs">
        {filters.map(f => (
          <button
            key={f.key}
            className={`sd-tab ${filter === f.key ? 'sd-tab-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sd-loading">⏳ جاري التحميل...</div>
      ) : orders.length === 0 ? (
        <div className="sd-empty"><span>📭</span><p>لا توجد طلبات</p></div>
      ) : (
        <div className="sd-orders-grid">
          {orders.map(order => {
            const st = STATUS_LABELS[order.status] || { label: order.status, color: '#6B7280', bg: '#F9FAFB' };
            return (
              <div className="sd-order-card" key={order._id} onClick={() => setSelected(order)}>
                <div className="sd-order-top">
                  <span className="sd-order-id">طلب #{order.orderId}</span>
                  <span className="sd-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>
                <p className="sd-order-customer">
                  👤 {order.customer_id?.F_name} {order.customer_id?.L_name}
                </p>
                <p className="sd-order-items">🛍️ {order.items?.length || 0} منتج</p>
                <div className="sd-order-bottom">
                  <span className="sd-order-price">{order.totalPrice?.toLocaleString('ar-EG')} جنيه</span>
                  <span className="sd-order-date">
                    {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <div className="sd-overlay" onClick={() => setSelected(null)}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h3>تفاصيل الطلب #{selected.orderId}</h3>
              <button className="sd-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="sd-modal-body">
              <div className="sd-detail-row">
                <span>العميل</span>
                <span>{selected.customer_id?.F_name} {selected.customer_id?.L_name}</span>
              </div>
              <div className="sd-detail-row">
                <span>التليفون</span>
                <span dir="ltr">{selected.customer_id?.Phone}</span>
              </div>
              <div className="sd-detail-row">
                <span>الحالة</span>
                <span className="sd-badge" style={{
                  color: STATUS_LABELS[selected.status]?.color,
                  background: STATUS_LABELS[selected.status]?.bg
                }}>
                  {STATUS_LABELS[selected.status]?.label}
                </span>
              </div>
              <div className="sd-detail-row">
                <span>إجمالي السعر</span>
                <strong>{selected.totalPrice?.toLocaleString('ar-EG')} جنيه</strong>
              </div>

              {selected.items?.length > 0 && (
                <div className="sd-items-list">
                  <p className="sd-items-title">المنتجات:</p>
                  {selected.items.map((item, i) => (
                    <div className="sd-item-row" key={i}>
                      <span>{item.name || item.productId}</span>
                      <span>× {item.quantity}</span>
                      <span>{item.price?.toLocaleString('ar-EG')} جنيه</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selected.status === 'admin_approved' && (
              <div className="sd-modal-actions">
                <button
                  className="sd-btn-reject"
                  onClick={() => handleAction(selected.orderId, 'reject')}
                  disabled={actLoading}
                >
                  {actLoading ? '...' : '❌ رفض'}
                </button>
                <button
                  className="sd-btn-accept"
                  onClick={() => handleAction(selected.orderId, 'approve')}
                  disabled={actLoading}
                >
                  {actLoading ? '...' : '✅ قبول الطلب'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
//  Financial View
// ══════════════════════════════════════════════════
function FinancialView() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [months,  setMonths]  = useState(1);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`${API}/api/supplier/stats?months=${months}`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        setStats(data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchStats();
  }, [months]);

  const cards = stats ? [
    { icon: '📥', label: 'إجمالي الطلبات الواردة', value: stats.stats.totalIncoming,    color: '#3B82F6' },
    { icon: '✅', label: 'تم التسليم',              value: stats.stats.totalDelivered,   color: '#10B981' },
    { icon: '⏳', label: 'في الانتظار',             value: stats.stats.pendingApproval,  color: '#F59E0B' },
    { icon: '🔄', label: 'قيد التنفيذ',             value: stats.stats.inProgress,       color: '#8B5CF6' },
    { icon: '❌', label: 'مرفوض',                   value: stats.stats.rejected,         color: '#EF4444' },
    { icon: '💰', label: 'الإيرادات',               value: `${stats.stats.totalRevenue?.toLocaleString('ar-EG')} ج`, color: '#059669' },
  ] : [];

  return (
    <div className="sd-section">
      <div className="sd-section-header">
        <h2 className="sd-section-title">💰 السجل المالي</h2>
        <div className="sd-period-tabs">
          {[1,2,3].map(m => (
            <button
              key={m}
              className={`sd-tab ${months === m ? 'sd-tab-active' : ''}`}
              onClick={() => setMonths(m)}
            >
              {m === 1 ? 'شهر' : m === 2 ? 'شهرين' : '3 شهور'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="sd-loading">⏳ جاري التحميل...</div>
      ) : !stats ? (
        <div className="sd-empty"><span>📊</span><p>لا توجد بيانات</p></div>
      ) : (
        <>
          <div className="sd-stats-grid">
            {cards.map((card, i) => (
              <div className="sd-stat-card" key={i} style={{ borderTopColor: card.color }}>
                <span className="sd-stat-icon">{card.icon}</span>
                <span className="sd-stat-value" style={{ color: card.color }}>{card.value}</span>
                <span className="sd-stat-label">{card.label}</span>
              </div>
            ))}
          </div>

          <div className="sd-rate-row">
            <span>نسبة التسليم:</span>
            <strong>{stats.stats.deliveryRate}</strong>
          </div>

          {stats.monthlyBreakdown?.length > 0 && (
            <div className="sd-monthly">
              <p className="sd-monthly-title">التفصيل الشهري</p>
              <div className="sd-monthly-grid">
                {stats.monthlyBreakdown.map((m, i) => (
                  <div className="sd-month-card" key={i}>
                    <span className="sd-month-name">{m.month}</span>
                    <span className="sd-month-val">{m.delivered} طلب</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
//  Settings View
// ══════════════════════════════════════════════════
function SettingsView({ supplier, onUpdated }) {
  const [form,    setForm]    = useState({
    name:    supplier?.name    || '',
    company: supplier?.company || '',
    notes:   supplier?.notes   || '',
  });
  const [pwForm,   setPwForm]   = useState({ current: '', newPw: '', confirm: '' });
  const [saving,   setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg,      setMsg]      = useState('');
  const [pwMsg,    setPwMsg]    = useState('');

  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setPw = (k, v) => setPwForm(f => ({ ...f, [k]: v }));

  const handleSaveProfile = async () => {
    setSaving(true); setMsg('');
    try {
      const res  = await fetch(`${API}/api/supplier/me/update`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ name: form.name, company: form.company, notes: form.notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg('✅ تم حفظ البيانات بنجاح');
      onUpdated?.();
    } catch (err) { setMsg(`⚠️ ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) return setPwMsg('⚠️ كلمتا المرور غير متطابقتين');
    if (pwForm.newPw.length < 6) return setPwMsg('⚠️ كلمة المرور يجب أن تكون 6 خانات على الأقل');
    setPwSaving(true); setPwMsg('');
    try {
      const res  = await fetch(`${API}/api/supplier/me/password`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPwMsg('✅ تم تغيير كلمة المرور بنجاح');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) { setPwMsg(`⚠️ ${err.message}`); }
    finally { setPwSaving(false); }
  };

  return (
    <div className="sd-section">
      <h2 className="sd-section-title">⚙️ إعدادات الحساب</h2>

      {/* Profile */}
      <div className="sd-settings-card">
        <h3 className="sd-settings-subtitle">البيانات الشخصية</h3>
        <div className="sd-form-grid">
          <div className="sd-field">
            <label>الاسم</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="sd-field">
            <label>الشركة</label>
            <input value={form.company} onChange={e => set('company', e.target.value)} />
          </div>
          <div className="sd-field sd-field-full">
            <label>ملاحظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>
        </div>
        <div className="sd-field-readonly">
          <label>رقم الهاتف</label>
          <span>{supplier?.phone || '—'}</span>
        </div>
        {msg && <p className="sd-msg">{msg}</p>}
        <button className="sd-btn-save" onClick={handleSaveProfile} disabled={saving}>
          {saving ? '⏳ جاري الحفظ...' : 'حفظ البيانات'}
        </button>
      </div>

      {/* Password */}
      <div className="sd-settings-card">
        <h3 className="sd-settings-subtitle">تغيير كلمة المرور</h3>
        <div className="sd-form-grid">
          <div className="sd-field">
            <label>كلمة المرور الحالية</label>
            <input type="password" value={pwForm.current} onChange={e => setPw('current', e.target.value)} />
          </div>
          <div className="sd-field">
            <label>كلمة المرور الجديدة</label>
            <input type="password" value={pwForm.newPw} onChange={e => setPw('newPw', e.target.value)} />
          </div>
          <div className="sd-field">
            <label>تأكيد كلمة المرور</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPw('confirm', e.target.value)} />
          </div>
        </div>
        {pwMsg && <p className="sd-msg">{pwMsg}</p>}
        <button className="sd-btn-save" onClick={handleChangePassword} disabled={pwSaving}>
          {pwSaving ? '⏳...' : 'تغيير كلمة المرور'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  Main Dashboard
// ══════════════════════════════════════════════════
export default function SupplierDashboard() {
  const [view,     setView]     = useState('orders');
  const [supplier, setSupplier] = useState(null);

  const navigate = (path) => { window.location.href = path; };

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'supplier') { navigate('/signin'); return; }

    const fetchMe = async () => {
      try {
        const res  = await fetch(`${API}/api/supplier/me`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        if (res.ok) setSupplier(data.supplier);
        else navigate('/signin');
      } catch { navigate('/signin'); }
    };
    fetchMe();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate('/signin');
  };

  return (
    <>
      <HeroSection showExtra={false}/>
      <div className="sd-layout">
        <SupplierSidebar
          view={view}
          setView={setView}
          supplier={supplier}
          onLogout={handleLogout}
        />
        <main className="sd-main">
          {view === 'orders'    && <OrdersView />}
          {view === 'financial' && <FinancialView />}
          {view === 'settings'  && <SettingsView supplier={supplier} onUpdated={() => {}} />}
        </main>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}