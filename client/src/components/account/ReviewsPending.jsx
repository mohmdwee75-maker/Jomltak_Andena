import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ReviewsPending.css';

const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;
    const parsed = JSON.parse(user);
    return { ...parsed, _id: parsed._id || parsed.id };
  } catch { return null; }
};

const renderStars = (ratingValue) => {
  const safe = Number(ratingValue) || 0;
  return [1, 2, 3, 4, 5].map(i => (
    <span key={i} style={{ color: i <= safe ? '#f5a623' : '#ddd', fontSize: '16px' }}>★</span>
  ));
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'اليوم';
  if (days === 1) return 'منذ يوم';
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسابيع`;
  if (days < 365) return `منذ ${Math.floor(days / 30)} شهور`;
  return `منذ ${Math.floor(days / 365)} سنوات`;
};

const ReviewsPending = () => {
  const currentUser = getCurrentUser();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!currentUser?._id) {
      setLoading(false);
      return;
    }
    fetchUserComments();
  }, []);

  const fetchUserComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/comments/user/${currentUser._id}`);
      if (!res.ok) throw new Error('فشل تحميل التعليقات');
      const data = await res.json();
      setComments(data.comments || data || []);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل تعليقاتك');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('هل تريد حذف هذا التعليق؟')) return;
    try {
      setDeletingId(commentId);
      const res = await fetch(`/api/comments/single/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser._id }),
      });
      if (!res.ok) throw new Error();
      setComments(prev => prev.filter(c => (c._id || c.id) !== commentId));
    } catch {
      alert('حدث خطأ أثناء حذف التعليق');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (commentId) => {
    if (editText.trim() === '') { alert('التعليق لا يمكن أن يكون فارغاً'); return; }
    try {
      const res = await fetch(`/api/comments/single/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser._id, text: editText, rating: editRating }),
      });
      if (!res.ok) throw new Error();
      setComments(prev => prev.map(c =>
        (c._id || c.id) === commentId ? { ...c, text: editText, rating: editRating } : c
      ));
      setEditingId(null);
    } catch {
      alert('حدث خطأ أثناء تعديل التعليق');
    }
  };

  // ─── Empty State ──────────────────────────────────────────────────────────
  if (!loading && comments.length === 0) {
    return (
      <div className="rp-wrapper">
        <div className="rp-empty-state">
          <div className="rp-empty-icon">
            <svg width="110" height="110" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="60" fill="#e8f1fa"/>
              <path d="M45 60L55 70L75 50" stroke="#306591" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="35" y="43" width="50" height="8" rx="2" fill="#306591"/>
              <rect x="40" y="51" width="40" height="30" rx="2" fill="#c8dff2" stroke="#306591" strokeWidth="2"/>
              <circle cx="50" cy="66" r="3" fill="#306591"/>
              <circle cx="60" cy="66" r="3" fill="#306591"/>
              <circle cx="70" cy="66" r="3" fill="#306591"/>
            </svg>
          </div>
          <h2 className="rp-empty-title">لقد قمت بتقييم جميع منتجاتك</h2>
          <p className="rp-empty-desc">
            يمكنك تقييم المنتج بعد استلامه، وسوف يتم عرض رأيك على الصفحة وذلك
            لمنح مستخدمي جملتك عندنا أفضل تجربة تسوق.
          </p>
          <Link to="/">
            <button className="rp-shop-btn">متابعة التسوق</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rp-wrapper">
      {/* Header */}
      <div className="rp-header">
        <div className="rp-header-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div>
          <h1 className="rp-title">تعليقاتي</h1>
          <p className="rp-subtitle">
            {loading ? 'جاري التحميل...' : `${comments.length} تعليق على منتجاتك`}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rp-loading">
          <div className="rp-spinner" />
          <span>جاري تحميل تعليقاتك...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rp-error">
          <span>⚠️ {error}</span>
          <button onClick={fetchUserComments} className="rp-retry-btn">إعادة المحاولة</button>
        </div>
      )}

      {/* Comments List */}
      {!loading && !error && (
        <div className="rp-list">
          {comments.map((c) => {
            const commentId = c._id || c.id;
            const isEditing = editingId === commentId;
            const isDeleting = deletingId === commentId;

            return (
              <div key={commentId} className={`rp-card ${isDeleting ? 'rp-card--deleting' : ''}`}>
                {/* Product Info */}
                {(c.productName || c.productImage) && (
                  <Link to={`/product/${c.product_id || c.productId}`} className="rp-product-link">
                    <div className="rp-product-bar">
                      {c.productImage && (
                        <img src={c.productImage} alt={c.productName} className="rp-product-img" />
                      )}
                      <span className="rp-product-name">{c.productName || 'منتج'}</span>
                      <svg className="rp-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                    </div>
                  </Link>
                )}

                <div className="rp-card-body">
                  {/* Stars & Date */}
                  <div className="rp-card-meta">
                    <div className="rp-stars">{renderStars(c.rating)}</div>
                    <span className="rp-date">{formatDate(c.createdAt || c.date)}</span>
                  </div>

                  {/* Edit Mode */}
                  {isEditing ? (
                    <div className="rp-edit-mode">
                      <div className="rp-edit-stars">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span
                            key={star}
                            onClick={() => setEditRating(star)}
                            style={{
                              fontSize: '28px',
                              cursor: 'pointer',
                              color: editRating >= star ? '#f5a623' : '#ddd',
                              transition: 'color 0.2s'
                            }}
                          >★</span>
                        ))}
                      </div>
                      <textarea
                        className="rp-edit-textarea"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                      />
                      <div className="rp-edit-actions">
                        <button className="rp-btn-cancel" onClick={() => setEditingId(null)}>إلغاء</button>
                        <button className="rp-btn-save" onClick={() => handleEdit(commentId)}>حفظ التعديل</button>
                      </div>
                    </div>
                  ) : (
                    <p className="rp-comment-text">{c.text}</p>
                  )}

                  {/* Action Buttons */}
                  {!isEditing && (
                    <div className="rp-card-actions">
                      <button
                        className="rp-btn-edit"
                        onClick={() => {
                          setEditingId(commentId);
                          setEditText(c.text);
                          setEditRating(c.rating);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        تعديل
                      </button>
                      <button
                        className="rp-btn-delete"
                        onClick={() => handleDelete(commentId)}
                        disabled={isDeleting}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                        {isDeleting ? 'جاري الحذف...' : 'حذف'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer CTA */}
      {!loading && comments.length > 0 && (
        <div className="rp-footer">
          <Link to="/">
            <button className="rp-shop-btn">متابعة التسوق</button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ReviewsPending;