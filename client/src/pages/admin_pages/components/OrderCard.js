// src/pages/admin/components/OrderCard.js
import React, { useState } from 'react';
import './Orders.css';

// ── Badge الحالة ────────────────────────────────────────────────
const STATUS_MAP = {
  pending:           { label: 'في الانتظار',        color: '#f59e0b', bg: '#fffbeb' },
  admin_approved:    { label: 'موافقة الأدمن',       color: '#3b82f6', bg: '#eff6ff' },
  supplier_approved: { label: 'موافقة السبلير',      color: '#8b5cf6', bg: '#f5f3ff' },
  shipped:           { label: 'جاري التوصيل',        color: '#06b6d4', bg: '#ecfeff' },
  delivered:         { label: 'تم التسليم',           color: '#10b981', bg: '#f0fdf4' },
  rejected:          { label: 'مرفوض',               color: '#ef4444', bg: '#fef2f2' },
  cancelled:         { label: 'ملغي',                color: '#6b7280', bg: '#f9fafb' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span className="ord-status-badge" style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}>
      {s.label}
    </span>
  );
};

// ── Supplier Approval Indicator ─────────────────────────────────
const SupplierStatus = ({ supplierApproval }) => {
  if (!supplierApproval) return null;

  if (supplierApproval.approved) {
    return (
      <div className="ord-supplier-status ord-supplier-yes">
        <i className="fa-solid fa-circle-check"></i>
        <div>
          <span>السبلير وافق</span>
          {supplierApproval.deliveryDate && (
            <small>موعد التسليم: {new Date(supplierApproval.deliveryDate).toLocaleDateString('ar-EG')}</small>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ord-supplier-status ord-supplier-waiting">
      <i className="fa-solid fa-clock"></i>
      <div>
        <span>في انتظار موافقة السبلير</span>
      </div>
    </div>
  );
};

// ── OrderCard ───────────────────────────────────────────────────
export default function OrderCard({ order, onApprove, onReject, onDeliver, showActions = true }) {
  const [expanded, setExpanded] = useState(false);

  const deliveryDate = order.deliveryInfo?.requestedDate
    ? new Date(order.deliveryInfo.requestedDate).toLocaleDateString('ar-EG')
    : '—';

  const createdAt = order.createdAt
    ? new Date(order.createdAt).toLocaleString('ar-EG')
    : '—';

  return (
    <div className="ord-card">

      {/* ── Header ── */}
      <div className="ord-card-header">
        <div className="ord-card-id">
          <i className="fa-solid fa-receipt"></i>
          <span>طلب #{order.orderId}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* ── Customer & Date ── */}
      <div className="ord-card-meta">
        <div className="ord-meta-item">
          <i className="fa-solid fa-user"></i>
          <span>{order.deliveryInfo?.fullName || '—'}</span>
        </div>
        <div className="ord-meta-item">
          <i className="fa-solid fa-phone"></i>
          <span>{order.deliveryInfo?.phone || '—'}</span>
        </div>
        <div className="ord-meta-item">
          <i className="fa-solid fa-location-dot"></i>
          <span>{order.deliveryInfo?.governorate} — {order.deliveryInfo?.city}</span>
        </div>
        <div className="ord-meta-item">
          <i className="fa-solid fa-calendar"></i>
          <span>طلب في: {createdAt}</span>
        </div>
        <div className="ord-meta-item">
          <i className="fa-solid fa-truck"></i>
          <span>توصيل: {deliveryDate}</span>
        </div>
      </div>

      {/* ── Supplier Status ── */}
      <SupplierStatus supplierApproval={order.supplierApproval} />

      {/* ── Total ── */}
      <div className="ord-card-total">
        <span>إجمالي الطلب</span>
        <span className="ord-total-price">{Number(order.totalPrice).toLocaleString('ar-EG')} ج.م</span>
      </div>

      {/* ── Items Toggle ── */}
      <button className="ord-toggle-items" onClick={() => setExpanded(p => !p)}>
        <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`}></i>
        {expanded ? 'إخفاء المنتجات' : `عرض المنتجات (${order.items?.length || 0})`}
      </button>

      {/* ── Items List ── */}
      {expanded && (
        <div className="ord-items-list">
          {order.items?.map((item, i) => (
            <div key={i} className="ord-item">
              {item.image && <img src={item.image} alt={item.name} className="ord-item-img" />}
              <div className="ord-item-info">
                <p className="ord-item-name">{item.name}</p>
                <p className="ord-item-price">
                  {item.quantity} × {Number(item.price).toLocaleString('ar-EG')} ج.م
                  <span> = {Number(item.subtotal).toLocaleString('ar-EG')} ج.م</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Admin Notes (if rejected/cancelled) ── */}
      {order.cancellation?.reason && (
        <div className="ord-cancel-note">
          <i className="fa-solid fa-circle-exclamation"></i>
          سبب الإلغاء: {order.cancellation.reason}
        </div>
      )}

      {/* ── Actions ── */}
      {showActions && (
        <div className="ord-card-actions">
          <button className="ord-btn-approve" onClick={() => onApprove(order)}>
            <i className="fa-solid fa-circle-check"></i> قبول الطلب
          </button>
          <button className="ord-btn-reject" onClick={() => onReject(order)}>
            <i className="fa-solid fa-circle-xmark"></i> رفض الطلب
          </button>
        </div>
      )}
      {/* ── زرار تأكيد التسليم للأدمن ── */}
{order.status === 'customer_confirmed' && onDeliver && (
  <div className="ord-card-actions" style={{ marginTop: 8 }}>
    <div className="ord-supplier-status ord-supplier-yes" style={{ marginBottom: 8 }}>
      <i className="fa-solid fa-circle-check"></i>
      <span>العميل أكد الاستلام</span>
    </div>
    <button
      className="ord-btn-approve"
      onClick={() => onDeliver(order)}
      style={{ width: '100%', background: '#10b981' }}
    >
      <i className="fa-solid fa-circle-check"></i> تأكيد التسليم النهائي
    </button>
  </div>
)}
    </div>
  );
}
