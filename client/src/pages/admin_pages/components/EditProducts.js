// src/pages/admin/components/EditProducts.js
import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:5000';

// ── ProductCard ──────────────────────────────────────────────
const ProductCard = ({ product, onDelete, onEdit }) => {
  const mainImage = product.media?.find(m => m.type === 'image')?.url
    || '/assets/images/placeholder.png';
  return (
    <div className="ep-card">
      <div className="ep-card-image">
        <img src={mainImage} alt={product.name} />
        {product.discount && <span className="ep-discount-badge">{product.discount}</span>}
      </div>
      <div className="ep-card-info">
        <p className="ep-card-name">{product.name}</p>
        <div className="ep-card-pricing">
          <span className="ep-current-price">{Number(product.price).toLocaleString('ar-EG')} جنيه</span>
          {product.oldPrice && (
            <span className="ep-old-price">{Number(product.oldPrice).toLocaleString('ar-EG')} جنيه</span>
          )}
        </div>
        <span className="ep-product-id">#{product.productId}</span>
      </div>
      <div className="ep-card-actions">
        <button className="ep-btn-edit" onClick={() => onEdit(product.productId)}>
          <i className="fa-solid fa-pen-to-square"></i> تعديل
        </button>
        <button className="ep-btn-delete" onClick={() => onDelete(product)}>
          <i className="fa-solid fa-trash"></i> حذف
        </button>
      </div>
    </div>
  );
};

// ── DeleteModal ──────────────────────────────────────────────
const DeleteModal = ({ product, onConfirm, onCancel, loading }) => (
  <div className="ep-modal-overlay" onClick={onCancel}>
    <div className="ep-modal" onClick={e => e.stopPropagation()}>
      <div className="ep-modal-icon">
        <i className="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3>تأكيد الحذف</h3>
      <p>هتحذف المنتج <strong>"{product.name}"</strong> نهائياً؟</p>
      <p className="ep-modal-warning">العملية دي مش هترجع!</p>
      <div className="ep-modal-actions">
        <button className="ep-modal-cancel" onClick={onCancel}>إلغاء</button>
        <button className="ep-modal-confirm" onClick={onConfirm} disabled={loading}>
          {loading
            ? <><span className="ep-spinner"></span> جاري الحذف...</>
            : 'حذف نهائي'
          }
        </button>
      </div>
    </div>
  </div>
);

// ── Main ─────────────────────────────────────────────────────
export default function EditProducts({ setView }) {
  const [products, setProducts]           = useState([]);
  const [search, setSearch]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [total, setTotal]                 = useState(0);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast]                 = useState('');

  const LIMIT = 12;

  const fetchProducts = useCallback(async (pageNum = 1) => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/api/products?page=${pageNum}&limit=${LIMIT}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      setError('فشل تحميل المنتجات — تأكد من تشغيل السيرفر');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(page); }, [page, fetchProducts]);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.productId).includes(search)
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/products/${deleteTarget.productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      if (res.ok) {
        setToast(`✅ تم حذف "${deleteTarget.name}" بنجاح`);
        setDeleteTarget(null);
        fetchProducts(page);
        setTimeout(() => setToast(''), 3000);
      } else {
        setError(data.message || 'فشل الحذف');
        setDeleteTarget(null);
      }
    } catch {
      setError('فشل الاتصال بالسيرفر');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <main className="ap-main">
        <header className="ap-header">
          <div>
            <h1 className="ap-title">إدارة المنتجات</h1>
            <p className="ap-subtitle">{total} منتج في الداتابيز</p>
          </div>
          <button
            className="ap-back-btn ep-add-btn"
            onClick={() => setView({ name: 'add-product' })}
          >
            <i className="fa-solid fa-plus"></i> إضافة منتج جديد
          </button>
        </header>

        {/* Search */}
        <div className="ep-searchbar">
          <div className="ep-search-input-wrapper">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="ابحث باسم المنتج أو رقمه..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="ep-search-clear" onClick={() => setSearch('')}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
          <span className="ep-search-count">
            {search ? `${filtered.length} نتيجة من ${total}` : `${total} منتج`}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="ap-alert ap-alert-error">
            <i className="fa-solid fa-triangle-exclamation"></i> {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="ep-loading">
            <span className="ep-spinner-lg"></span>
            <p>جاري تحميل المنتجات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ep-empty">
            <i className="fa-solid fa-box-open"></i>
            <p>{search ? 'مفيش نتايج للبحث ده' : 'مفيش منتجات لحد دلوقتي'}</p>
            {search && <button onClick={() => setSearch('')}>مسح البحث</button>}
          </div>
        ) : (
          <div className="ep-grid">
            {filtered.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                onDelete={setDeleteTarget}
                onEdit={id => setView({ name: 'edit-product', id })}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!search && totalPages > 1 && (
          <div className="ep-pagination">
            <button className="ep-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`ep-page-btn ${p === page ? 'ep-page-active' : ''}`}
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button className="ep-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <i className="fa-solid fa-chevron-left"></i>
            </button>
          </div>
        )}
      </main>

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* Toast */}
      {toast && <div className="ep-toast">{toast}</div>}
    </>
  );
}
