import { useState, useEffect } from 'react';
import axios from 'axios';
import './MyOrders.css';

const statusMap = {
  pending:            { label: 'قيد المراجعة',      color: 'status-pending'   },
  confirmed:          { label: 'تم التأكيد',         color: 'status-confirmed' },
  admin_approved:     { label: 'تمت الموافقة',       color: 'status-approved'  },
  supplier_approved:  { label: 'جاهز للشحن',         color: 'status-shipping'  },
  shipped:            { label: 'في الطريق إليك',     color: 'status-shipped'   },
  delivered:          { label: 'تم التسليم',         color: 'status-delivered' },
  customer_confirmed: { label: 'تم استلام الطلب',   color: 'status-delivered' },
  rejected:           { label: 'مرفوض',              color: 'status-rejected'  },
  cancelled:          { label: 'ملغي',               color: 'status-cancelled' },
};

// الحالات اللي يقدر يلغي فيها بنفسه
const CAN_CANCEL   = ['pending', 'admin_approved'];
// الحالات اللي لازم يتواصل مع الدعم
const NEED_SUPPORT = ['supplier_approved', 'shipped'];

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

// ── مودال تأكيد الإلغاء ───────────────────────────────
const CancelModal = ({ order, onConfirm, onClose, loading }) => {
  const [reason, setReason] = useState('');
  const reasons = [
    'غيرت رأيي',
    'طلبت بالغلط',
    'وجدت سعر أحسن',
    'تأخر التأكيد',
    'سبب آخر',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">إلغاء الطلب #{order.orderId}</h3>
        <p className="modal-subtitle">اختر سبب الإلغاء</p>
        <div className="modal-reasons">
          {reasons.map(r => (
            <label key={r} className={`reason-option ${reason === r ? 'selected' : ''}`}>
              <input type="radio" name="reason" value={r}
                checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>تراجع</button>
          <button className="modal-btn-confirm" disabled={!reason || loading}
            onClick={() => onConfirm(order.orderId, reason)}>
            {loading ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── مودال التواصل مع الدعم ────────────────────────────
const SupportModal = ({ order, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-box" onClick={e => e.stopPropagation()}>
      <div className="support-icon">🎧</div>
      <h3 className="modal-title">تواصل مع الدعم</h3>
      <p className="modal-subtitle">
        الطلب رقم <strong>#{order.orderId}</strong> وصل لمرحلة متقدمة،
        لا يمكن إلغاؤه تلقائياً.
      </p>
      <div className="support-options">
        <a href="https://wa.me/201000000000" target="_blank" rel="noreferrer"
          className="support-btn whatsapp">
          <span>💬</span> تواصل عبر واتساب
        </a>
        <a href="tel:+201000000000" className="support-btn phone">
          <span>📞</span> اتصل بنا
        </a>
        <a href="mailto:support@jomltak.com" className="support-btn email">
          <span>✉️</span> راسلنا على الإيميل
        </a>
      </div>
      <p className="support-note">اذكر رقم الطلب <strong>#{order.orderId}</strong> عند التواصل</p>
      <button className="modal-btn-cancel" style={{ width: '100%', marginTop: '12px' }}
        onClick={onClose}>إغلاق</button>
    </div>
  </div>
);

// ── ويدجت تأكيد الاستلام المزدوج ─────────────────────
const ConfirmDeliveryWidget = ({ orderId, onConfirm }) => {
  const [step, setStep] = useState(0);

  // الخطوة الأولى: تنبيه + زرار أولي
  if (step === 0) return (
    <div style={{
      background: '#f0fdf4',
      border: '1.5px solid #10b981',
      borderRadius: 12,
      padding: '16px',
      marginTop: 12,
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '1.3rem', marginBottom: 4 }}>📦</p>
      <p style={{ color: '#065f46', fontWeight: 'bold', marginBottom: 6, fontSize: '0.95rem' }}>
        هل وصلك الطلب؟
      </p>
      <p style={{
        color: '#b45309',
        fontSize: '0.82rem',
        background: '#fef3c7',
        border: '1px solid #fcd34d',
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 14,
      }}>
        ⚠️ لا تضغط على زرار التأكيد إلا بعد استلام طلبك فعلاً —
        هذا الإجراء سيُغلق الطلب ولا يمكن التراجع عنه
      </p>
      <button
        onClick={() => setStep(1)}
        style={{
          background: '#10b981', color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 28px', cursor: 'pointer',
          fontWeight: 'bold', fontSize: '0.95rem',
        }}
      >
        ✅ نعم، استلمت الطلب
      </button>
    </div>
  );

  // الخطوة الثانية: تأكيد نهائي بزرارين
  if (step === 1) return (
    <div style={{
      background: '#fffbeb',
      border: '1.5px solid #f59e0b',
      borderRadius: 12,
      padding: '16px',
      marginTop: 12,
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '1.3rem', marginBottom: 4 }}>🤔</p>
      <p style={{ color: '#92400e', fontWeight: 'bold', marginBottom: 6 }}>
        تأكيد نهائي
      </p>
      <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 16 }}>
        هل أنت متأكد تماماً إنك استلمت الطلب؟ <br />
        <strong style={{ color: '#dc2626' }}>لن تتمكن من التراجع عن هذا الإجراء</strong>
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStep(0)}
          style={{
            background: '#fff', color: '#374151',
            border: '1px solid #d1d5db', borderRadius: 8,
            padding: '9px 22px', cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          ❌ لا، لم أستلم بعد
        </button>
        <button
          onClick={() => onConfirm(orderId)}
          style={{
            background: '#10b981', color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 22px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '0.9rem',
          }}
        >
          ✅ نعم، تأكيد الاستلام
        </button>
      </div>
    </div>
  );
};


export default function MyOrders() {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [expanded,     setExpanded]     = useState(null);
  const [cancelModal,  setCancelModal]  = useState(null);
  const [supportModal, setSupportModal] = useState(null);
  const [cancelling,   setCancelling]   = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get((process.env.REACT_APP_API_URL || '') + '/api/orders/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(res.data.orders);
      } catch {
        setError('حدث خطأ في تحميل الطلبات');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleCancel = async (orderId, reason) => {
    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.REACT_APP_API_URL || ''}/api/orders/cancel/${orderId}`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders(prev => prev.map(o =>
        o.orderId === orderId ? { ...o, status: 'cancelled' } : o
      ));
      setCancelModal(null);
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL || ''}/api/orders/customer-confirm/${orderId}`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders(prev => prev.map(o =>
        o.orderId === orderId ? { ...o, status: 'customer_confirmed' } : o
      ));
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ');
    }
  };

  if (loading) return <div className="orders-loading">جاري تحميل الطلبات...</div>;
  if (error)   return <div className="orders-error">{error}</div>;
  if (orders.length === 0) return (
    <div className="orders-empty">
      <div className="orders-empty-icon">📦</div>
      <h3>لا يوجد طلبات بعد</h3>
      <p>لم تقم بأي طلب حتى الآن</p>
    </div>
  );

  return (
    <div className="my-orders">
      {/* المودالات */}
      {cancelModal  && <CancelModal  order={cancelModal}  onConfirm={handleCancel} onClose={() => setCancelModal(null)} loading={cancelling} />}
      {supportModal && <SupportModal order={supportModal} onClose={() => setSupportModal(null)} />}

      <div className="orders-count">{orders.length} طلب</div>

      <div className="orders-list">
        {orders.map(order => {
          const status        = statusMap[order.status] || { label: order.status, color: 'status-pending' };
          const isOpen        = expanded === order._id;
          const isLegacy      = !order.items || order.items.length === 0;
          const previewImages = (order.items || []).slice(0, 3).map(i => i.image).filter(Boolean);
          const itemsCount    = (order.items || []).length;

          const canCancel   = CAN_CANCEL.includes(order.status);
          const needSupport = NEED_SUPPORT.includes(order.status);

          return (
            <div key={order._id} className="order-card">

              {/* رأس البطاقة */}
              <div className="order-card-header" onClick={() => setExpanded(isOpen ? null : order._id)}>
                <div className="order-images-stack">
                  {isLegacy ? (
                    <img src={order.product_id?.media?.[0]?.url || ''} alt="" className="order-stack-img" />
                  ) : previewImages.length > 0 ? (
                    previewImages.map((img, i) => (
                      <img key={i} src={img} alt="" className="order-stack-img"
                        style={{ zIndex: previewImages.length - i, marginRight: i > 0 ? '-20px' : '0' }} />
                    ))
                  ) : (
                    <div className="order-stack-placeholder">📦</div>
                  )}
                  {itemsCount > 3 && <span className="order-stack-more">+{itemsCount - 3}</span>}
                </div>

                <div className="order-card-info">
                  <p className="order-product-name">
                    {isLegacy
                      ? order.product_id?.name || 'منتج'
                      : itemsCount === 1 ? order.items[0].name : `${itemsCount} منتجات`}
                  </p>
                  <p className="order-meta">طلب رقم: <strong>#{order.orderId}</strong></p>
                  <p className="order-meta">تاريخ الطلب: {formatDate(order.createdAt)}</p>
                </div>

                <div className="order-card-left">
                  <span className={`order-status-badge ${status.color}`}>{status.label}</span>
                  <p className="order-total">{order.totalPrice?.toLocaleString()} جنيه</p>
                  <span className="order-toggle">{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* تفاصيل الطلب */}
              {isOpen && (
                <div className="order-card-details">

                  {/* المنتجات */}
                  <div className="detail-section">
                    <h4 className="detail-title">المنتجات</h4>
                    {isLegacy ? (
                      <div className="order-detail-item">
                        <img src={order.product_id?.media?.[0]?.url || ''} alt="" className="detail-item-img" />
                        <div className="detail-item-info">
                          <p className="detail-item-name">{order.product_id?.name || 'منتج'}</p>
                          <p className="detail-item-meta">الكمية: {order.quantity} وحدة</p>
                          <p className="detail-item-meta">سعر الوحدة: {order.price?.toLocaleString()} جنيه</p>
                        </div>
                        <p className="detail-item-subtotal">{order.totalPrice?.toLocaleString()} جنيه</p>
                      </div>
                    ) : (
                      (order.items || []).map((item, i) => (
                        <div key={i} className="order-detail-item">
                          {item.image
                            ? <img src={item.image} alt={item.name} className="detail-item-img" />
                            : <div className="detail-item-img-placeholder">📦</div>}
                          <div className="detail-item-info">
                            <p className="detail-item-name">{item.name || 'منتج'}</p>
                            <p className="detail-item-meta">الكمية: {item.quantity} وحدة</p>
                            <p className="detail-item-meta">سعر الوحدة: {item.price?.toLocaleString()} جنيه</p>
                          </div>
                          <p className="detail-item-subtotal">{item.subtotal?.toLocaleString()} جنيه</p>
                        </div>
                      ))
                    )}
                    <div className="detail-row total">
                      <span>الإجمالي</span>
                      <span>{order.totalPrice?.toLocaleString()} جنيه</span>
                    </div>
                  </div>

                  {/* بيانات التوصيل */}
                  <div className="detail-section">
                    <h4 className="detail-title">بيانات التوصيل</h4>
                    {[
                      { label: 'الاسم',                 value: order.deliveryInfo?.fullName },
                      { label: 'الهاتف',                value: order.deliveryInfo?.phone },
                      { label: 'العنوان',               value: order.deliveryInfo?.address },
                      { label: 'المحافظة',              value: order.deliveryInfo?.governorate },
                      { label: 'الحي',                  value: order.deliveryInfo?.district },
                      { label: 'أقرب معلم',             value: order.deliveryInfo?.landmark },
                      { label: 'نوع العنوان',           value: order.deliveryInfo?.addressType === 'home' ? '🏠 منزل' : '🏢 مكتب' },
                      { label: 'تاريخ التسليم المطلوب', value: formatDate(order.deliveryInfo?.requestedDate) },
                      { label: 'ملاحظات',               value: order.deliveryInfo?.notes },
                    ].filter(r => r.value).map((row, i) => (
                      <div key={i} className="detail-row">
                        <span>{row.label}</span>
                        <span>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* التايم لاين */}
                  <div className="detail-section">
                    <h4 className="detail-title">حالة الطلب</h4>
                    {order.status === 'cancelled' ? (
                      <div className="cancelled-info">
                        <span className="cancelled-icon">🚫</span>
                        <div>
                          <p>تم إلغاء الطلب</p>
                          {order.cancellation?.reason    && <p className="cancelled-reason">السبب: {order.cancellation.reason}</p>}
                          {order.cancellation?.cancelledAt && <p className="cancelled-reason">في: {formatDate(order.cancellation.cancelledAt)}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="order-timeline">
                        {[
                          { key: 'pending',            label: 'تم الاستلام'      },
                          { key: 'admin_approved',     label: 'تمت الموافقة'     },
                          { key: 'supplier_approved',  label: 'جاهز للشحن'       },
                          { key: 'shipped',            label: 'في الطريق إليك'   },
                          { key: 'customer_confirmed', label: 'تم استلام الطلب'  },
                          { key: 'delivered',          label: 'تم التسليم'       },
                        ].map((step, i) => {
                          const steps   = ['pending', 'admin_approved', 'supplier_approved', 'shipped', 'customer_confirmed', 'delivered'];
                          const currIdx = steps.indexOf(order.status);
                          const stepIdx = steps.indexOf(step.key);
                          const isDone  = stepIdx <= currIdx && currIdx !== -1;
                          return (
                            <div key={step.key} className={`timeline-step ${isDone ? 'done' : ''}`}>
                              <div className="timeline-dot">{isDone ? '✓' : i + 1}</div>
                              <span>{step.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── أزرار الإلغاء / الدعم ── */}
                  {canCancel && (
                    <button className="cancel-order-btn" onClick={() => setCancelModal(order)}>
                      🚫 إلغاء الطلب
                    </button>
                  )}

                  {needSupport && (
                    <div className="support-notice">
                      <p>⚠️ الطلب في مرحلة متقدمة، للإلغاء أو الاستفسار:</p>
                      <button className="contact-support-btn" onClick={() => setSupportModal(order)}>
                        🎧 تواصل مع الدعم
                      </button>
                    </div>
                  )}

                  {/* ── ويدجت تأكيد الاستلام — يظهر فقط لما الأوردر shipped ── */}
                  {order.status === 'shipped' && (
                    <ConfirmDeliveryWidget orderId={order.orderId} onConfirm={handleConfirmDelivery} />
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}