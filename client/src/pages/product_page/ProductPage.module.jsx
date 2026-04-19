import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import './ProductPage.css';

// ─── جيب بيانات اليوزر من localStorage ───────────────────────────────────────
const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;
    const parsed = JSON.parse(user);
    return { ...parsed, _id: parsed._id || parsed.id };
  } catch { return null; }
};

const ProductPage = () => {


  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [showCartToast, setShowCartToast] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // ─── Swipe state ──────────────────────────────────────────────────────────
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isDragging = useRef(false);
  const trackRef = useRef(null);
  const autoPlayRef = useRef(null);

  // ─── Auto-play every 3 seconds ────────────────────────────────────────────
  const goTo = useCallback((index) => {
    if (!mediaItems.length) return;
    setCurrentIndex((index + mediaItems.length) % mediaItems.length);
  }, [mediaItems.length]);

  const resetAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % (mediaItems.length || 1));
    }, 3000);
  }, [mediaItems.length]);

  useEffect(() => {
    if (!mediaItems.length) return;
    resetAutoPlay();
    return () => clearInterval(autoPlayRef.current);
  }, [mediaItems.length, resetAutoPlay]);

  // ─── Touch / Swipe handlers ───────────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    clearInterval(autoPlayRef.current);
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      isDragging.current = true;
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (isDragging.current && Math.abs(dx) > 40) {
      if (dx > 0) {
        goTo(currentIndex - 1);
      } else {
        goTo(currentIndex + 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    isDragging.current = false;
    resetAutoPlay();
  };

  // Mouse drag for desktop
  const mouseStartX = useRef(null);
  const handleMouseDown = (e) => {
    mouseStartX.current = e.clientX;
    clearInterval(autoPlayRef.current);
  };
  const handleMouseUp = (e) => {
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    if (Math.abs(dx) > 40) {
      dx > 0 ? goTo(currentIndex - 1) : goTo(currentIndex + 1);
    }
    mouseStartX.current = null;
    resetAutoPlay();
  };

  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [id]);
  // ─── استرجاع التعليق المحفوظ مؤقتاً ──────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('pending_comment');
    if (saved && currentUser) {
      try {
        const { productId, text, rating: savedRating } = JSON.parse(saved);
        if (productId === id) {
          setComment(text);
          setRating(savedRating);
          localStorage.removeItem('pending_comment');
        }
      } catch { localStorage.removeItem('pending_comment'); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUser?._id]);

  // ─── جيب بيانات المنتج ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/products/${id}`);
        const data = await response.json();

        setProductData({
          title: data.name,
          category: data.category || data.categoryName || '',
          categoryId: data.categoryId || data.category_id || '',
          currentPrice: `${data.price} جنيه`,
          oldPrice: `${data.oldPrice} جنيه`,
          discount: data.discount,
          description: data.description,
          rating: data.rating || 0,
          reviewsCount: data.reviewsCount || 0,
          minQuantity: data.minQuantity || 1,
          ratingBreakdown: data.ratingBreakdown || null,
        });

        setMediaItems(data.media?.map(item => ({
          type: item.type,
          src: item.url,
          alt: item.alt,
        })) || []);

      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
    else setLoading(false);
  }, [id]);

  // ─── جيب التعليقات ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    fetchComments(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchComments = async (pageNum = 1, reset = false) => {
    try {
      setCommentsLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/comments/${id}?page=${pageNum}&limit=8`);
      const data = await res.json();

      setComments(prev => reset ? data.comments : [...prev, ...data.comments]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadMoreComments = () => fetchComments(page + 1);

  // ─── إرسال تعليق ──────────────────────────────────────────────────────────
  const handleSubmitComment = async () => {
    if (rating === 0) { alert('من فضلك اختر تقييمك للمنتج'); return; }
    if (comment.trim() === '') { alert('من فضلك اكتب تعليقك'); return; }

    if (!currentUser) {
      localStorage.setItem('pending_comment', JSON.stringify({ productId: id, text: comment, rating }));
      navigate('/sign-in', { state: { from: `/product/${id}` } });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/comments/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser._id, text: comment, rating }),
      });
      if (!res.ok) throw new Error('فشل إرسال التعليق');
      const newComment = await res.json();
      setComments(prev => [newComment, ...prev]);
      setComment('');
      setRating(0);
      setProductData(prev => ({ ...prev, reviewsCount: prev.reviewsCount + 1 }));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال التعليق');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── حذف تعليق ────────────────────────────────────────────────────────────
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('هل تريد حذف هذا التعليق؟')) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/comments/single/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser._id }),
      });
      if (!res.ok) throw new Error();
      setComments(prev => prev.filter(c => c.id !== commentId));
      setProductData(prev => ({ ...prev, reviewsCount: Math.max(0, prev.reviewsCount - 1) }));
    } catch {
      alert('حدث خطأ أثناء حذف التعليق');
    }
  };

  // ─── تعديل تعليق ──────────────────────────────────────────────────────────
  const handleEditComment = async (commentId) => {
    if (editText.trim() === '') { alert('التعليق لا يمكن أن يكون فارغاً'); return; }
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/comments/single/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser._id, text: editText, rating: editRating }),
      });
      if (!res.ok) throw new Error();
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, text: editText, rating: editRating } : c
      ));
      setEditingId(null);
    } catch {
      alert('حدث خطأ أثناء تعديل التعليق');
    }
  };

  // ─── مساعدات ──────────────────────────────────────────────────────────────
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

  const renderStars = (ratingValue, small = false) => {
    const safe = Number(ratingValue) || 0;
    return [1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        className={small
          ? `pp-star-sm${i <= safe ? ' pp-filled' : ''}`
          : `pp-star${i <= safe ? ' pp-filled' : ''}`}
      >★</span>
    ));
  };

  // ─── حساب تحليل النجوم من التعليقات ──────────────────────────────────────
  const getRatingBreakdown = () => {
    if (productData?.ratingBreakdown) {
      return productData.ratingBreakdown;
    }
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    comments.forEach(c => {
      const r = Math.round(Number(c.rating));
      if (r >= 1 && r <= 5) breakdown[r]++;
    });
    return breakdown;
  };

  // ─── Render تحليل النجوم ──────────────────────────────────────────────────
  const renderRatingBreakdown = () => {
    const breakdown = getRatingBreakdown();
    const total = productData?.reviewsCount || Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;

    return (
      <div className="pp-rating-breakdown">
        <div className="pp-rating-big-score">
          <span className="pp-rating-big-number">{Number(productData.rating).toFixed(1)}</span>
          <div className="pp-rating-big-stars">{renderStars(Math.round(productData.rating))}</div>
          <span className="pp-rating-big-count">بناءً على {productData.reviewsCount} تقييم</span>
        </div>

        <div className="pp-rating-bars">
          {[5, 4, 3, 2, 1].map(star => {
            const count = breakdown[star] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={star} className="pp-rating-bar-row">
                <span className="pp-rating-bar-label">{star}</span>
                <span className="pp-rating-bar-star">★</span>
                <div className="pp-rating-bar-track">
                  <div
                    className="pp-rating-bar-fill"
                    style={{ width: `${pct}%`, backgroundColor: pct > 0 ? '#4CAF50' : '#e0e0e0' }}
                  />
                </div>
                <span className="pp-rating-bar-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div className="pp-loading">جاري التحميل...</div>;
  if (!productData) return <div className="pp-error">المنتج غير موجود</div>;

  const WORD_LIMIT = 30;
  const words = productData.description ? productData.description.split(" ") : [];
  const isLong = words.length > WORD_LIMIT;
  const displayed = expanded || !isLong
    ? productData.description
    : words.slice(0, WORD_LIMIT).join(" ") + "...";

  return (
    <div className="pp-page-wrapper">
      <div className="pp-product-container">

        {/* ── Breadcrumb ── */}
        <div className="pp-breadcrumb">
          <span className="pp-breadcrumb-item" onClick={() => navigate('/')}>الرئيسية</span>
          <span className="pp-breadcrumb-sep">‹</span>
          {productData.category && (
            <>
              <span className="pp-breadcrumb-item" onClick={() => navigate(`/category/${productData.categoryId || ''}`)}>
                {productData.category}
              </span>
              <span className="pp-breadcrumb-sep">‹</span>
            </>
          )}
          <span className="pp-breadcrumb-current">{productData.title}</span>
        </div>

        {/* ── رأس الصفحة: اسم + تقييم ── */}
        <div className="pp-product-header-top">
          {productData.category && (
            <p className="pp-product-category">{productData.category}</p>
          )}
          <h1 className="pp-product-title">{productData.title}</h1>

          <div className="pp-product-rating-row">
            <span className="pp-rating-count-small">({productData.reviewsCount})</span>
            <span className="pp-rating-number-small">{productData.rating}</span>
            <div className="pp-rating-stars-small">
              {renderStars(productData.rating, true)}
            </div>
          </div>
        </div>

        {/* ── معرض الصور ── */}
        <div
          className="pp-product-gallery"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { mouseStartX.current = null; }}
          style={{ cursor: 'grab' }}
        >
          <div className="pp-gallery-thumbs">
            {mediaItems.map((item, index) => (
              <div
                key={index}
                className={`pp-thumb-item${index === currentIndex ? ' pp-thumb-active' : ''}`}
                onClick={() => { goTo(index); resetAutoPlay(); }}
              >
                {item.type === 'image'
                  ? <img src={item.src} alt={item.alt} />
                  : <video src={item.src} muted />
                }
              </div>
            ))}
          </div>

          <div className="pp-gallery-main" style={{ position: 'relative' }}>
            <button
              className="pp-wishlist-btn"
              onClick={async (e) => {
                e.preventDefault();
                const token = localStorage.getItem('token');
                if (!token) { alert('سجل دخولك الأول عشان تضيف للمفضلة'); return; }
                try {
                  const res = await fetch('https://jomltak-andena-server-production.up.railway.app' + '/api/wishlist/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ productId: id })
                  });
                  const data = await res.json();
                  res.ok ? alert('تمت الإضافة للمفضلة ✅') : alert(data.message);
                } catch (err) { console.error(err); }
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <div className="pp-gallery-track-wrapper">
              <div
                ref={trackRef}
                className="pp-gallery-track"
                style={{ transform: `translateX(${currentIndex * 100}%)` }}
              >
                {mediaItems.map((item, index) => (
                  <div key={index} className="pp-media-slide">
                    {item.type === 'image'
                      ? <img src={item.src} alt={item.alt} draggable="false" />
                      : <video controls>
                        <source src={item.src} type="video/mp4" />
                      </video>
                    }
                  </div>
                ))}
              </div>
            </div>

            {mediaItems.length > 1 && (
              <div className="pp-gallery-dots">
                {mediaItems.map((_, index) => (
                  <button
                    key={index}
                    className={`pp-dot${index === currentIndex ? ' pp-active' : ''}`}
                    onClick={() => { goTo(index); resetAutoPlay(); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── باقي معلومات المنتج ── */}
        <div className="pp-product-info">
          <div className="pp-product-price">
            <span className="pp-current-price">{productData.currentPrice}</span>
            <span className="pp-old-price">{productData.oldPrice}</span>
            <span className="pp-discount-badge">خصم {productData.discount}</span>
          </div>

          <div className="pp-product-description">
            <h3 className="pp-section-title">وصف المنتج</h3>
            <p>
              {displayed}
              {isLong && (
                <button
                  className="pp-show-more-btn"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? "إخفاء" : "إظهار المزيد"}
                </button>
              )}
            </p>
          </div>

          <div className="pp-product-description">
            <h3 className="pp-section-title">أقل كمية متاحة: {productData.minQuantity}</h3>
          </div>

          <div className="pp-product-rating">
            <div className="pp-rating-summary">
              <div className="pp-rating-stars">{renderStars(productData.rating)}</div>
              <span className="pp-rating-number">{productData.rating}</span>
              <span className="pp-rating-count">({productData.reviewsCount} تقييم)</span>
            </div>
          </div>

          <div className="pp-action-buttons">
            <button
              className="pp-add-to-cart-btn"
              onClick={() => {
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                const existingItem = cart.find(item => item.id === id);
                if (existingItem) {
                  existingItem.quantity += 1;
                } else {
                  cart.push({
                    id, name: productData.title,
                    price: parseFloat(productData.currentPrice),
                    oldPrice: parseFloat(productData.oldPrice),
                    discount: parseInt(productData.discount),
                    image: mediaItems[0]?.src || '',
                    quantity: 1, inStock: true,
                    maxQuantity: productData.minQuantity || 10,
                  });
                }
                localStorage.setItem('cart', JSON.stringify(cart));
                setShowCartToast(true);
              }}
            >
              <svg className="pp-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span>إضافة إلى السلة</span>
            </button>

            <button
              className="pp-order-now-btn"
              onClick={() => {
                const token = localStorage.getItem('token');
                if (!token) {
                  navigate('/sign-in', { state: { from: `/product/${id}` } });
                  return;
                }
                navigate('/order', {
                  state: {
                    product: {
                      productId: id,
                      name: productData.title,
                      price: parseFloat(productData.currentPrice),
                      minQuantity: productData.minQuantity,
                      media: mediaItems.map(m => ({ url: m.src }))
                    }
                  }
                });
              }}
            >
              <svg className="pp-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span>اطلب الآن</span>
            </button>
          </div>

          <div className="pp-product-features">
            <div className="pp-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>ضمان سنتين</span>
            </div>
            <div className="pp-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>شحن مجاني</span>
            </div>
            <div className="pp-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>إرجاع خلال 14 يوم</span>
            </div>
          </div>

          {/* ── تفاصيل التوصيل ── */}
          <div className="pp-delivery-section">
            <div className="pp-delivery-header">
              <svg className="pp-delivery-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <path d="M16 8h4l3 4v4h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span className="pp-delivery-title">تفاصيل التوصيل</span>
              <div className="pp-delivery-logo">
                <span className="pp-delivery-logo-text">جملتك <span>عندنا</span></span>
              </div>
            </div>

            <div className="pp-delivery-row">
              <svg className="pp-delivery-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div className="pp-delivery-text">
                <span className="pp-delivery-label">مدة التوصيل</span>
                <span className="pp-delivery-detail">يصلك خلال <strong>3 – 5 أيام عمل</strong> من تأكيد الطلب</span>
                <span className="pp-delivery-badge">توصيل سريع</span>
              </div>
            </div>

            <div className="pp-delivery-row">
              <svg className="pp-delivery-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div className="pp-delivery-text">
                <span className="pp-delivery-label">التوصيل لجميع المحافظات</span>
                <span className="pp-delivery-detail">نوصل لكل محافظات مصر من الإسكندرية للأقصر</span>
              </div>
            </div>

            <div className="pp-delivery-row">
              <svg className="pp-delivery-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div className="pp-delivery-text">
                <span className="pp-delivery-label">دفع آمن عند الاستلام</span>
                <span className="pp-delivery-detail">ادفع كاش أو بطاقة عند استلام الطلب</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── قسم التعليقات ── */}
      <div className="pp-comments-section">
        <h2 className="pp-comments-title">التقييمات والتعليقات</h2>

        <div className="pp-reviews-layout">

          {productData.reviewsCount > 0 && (
            <div className="pp-reviews-sidebar">
              {renderRatingBreakdown()}
            </div>
          )}

          <div className="pp-reviews-main">

            <div className="pp-add-comment">
              <h3 className="pp-add-comment-title">أضف تقييمك</h3>
              <div className="pp-rating-input">
                <span className="pp-rating-label">التقييم:</span>
                <div className="pp-star-rating">
                  {[5, 4, 3, 2, 1].map(star => (
                    <React.Fragment key={star}>
                      <input type="radio" id={`star${star}`} name="rating" value={star}
                        checked={rating === star} onChange={() => setRating(star)} />
                      <label htmlFor={`star${star}`}>★</label>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <textarea className="pp-comment-input" placeholder="اكتب تعليقك هنا..."
                value={comment} onChange={e => setComment(e.target.value)} />
              <button className="pp-submit-comment-btn" onClick={handleSubmitComment} disabled={submitting}>
                {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
              </button>
            </div>

            <div className="pp-comments-list">
              {commentsLoading && comments.length === 0 ? (
                <div className="pp-loading">جاري تحميل التعليقات...</div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>
                  لا توجد تعليقات بعد، كن أول من يعلّق!
                </div>
              ) : (
                comments.map(commentItem => (
                  <div key={commentItem.id} className="pp-comment-card">
                    <div className="pp-comment-header">
                      <div className="pp-user-info">
                        <div className="pp-user-avatar">
                          {commentItem.image
                            ? <img src={commentItem.image} alt={commentItem.userName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            : commentItem.userName?.charAt(0) || '؟'
                          }
                        </div>
                        <div className="pp-user-details">
                          <h4 className="pp-user-name">{commentItem.userName || 'مجهول'}</h4>
                          <span className="pp-comment-date">{formatDate(commentItem.date)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="pp-comment-rating">{renderStars(commentItem.rating)}</div>

                        {currentUser && commentItem.userId && commentItem.userId.toString() === currentUser._id?.toString() && (
                          <div style={{ display: 'flex', gap: '0.4rem', marginRight: '0.5rem' }}>
                            <button onClick={() => {
                              setEditingId(commentItem.id);
                              setEditText(commentItem.text);
                              setEditRating(commentItem.rating);
                            }} style={{ background: 'none', border: '1px solid #ccc', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.8rem', color: '#555' }}>
                              ✏️ تعديل
                            </button>
                            <button onClick={() => handleDeleteComment(commentItem.id)}
                              style={{ background: 'none', border: '1px solid #f99', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.8rem', color: '#e33' }}>
                              🗑️ حذف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingId === commentItem.id ? (
                      <div style={{ marginTop: '0.8rem' }}>
                        <div className="pp-star-rating" style={{ marginBottom: '0.5rem', direction: 'ltr', display: 'flex', justifyContent: 'flex-end' }}>
                          {[5, 4, 3, 2, 1].map(star => (
                            <React.Fragment key={star}>
                              <input type="radio" id={`edit-star${star}-${commentItem.id}`} name={`edit-rating-${commentItem.id}`}
                                value={star} checked={editRating === star} onChange={() => setEditRating(star)} style={{ display: 'none' }} />
                              <label htmlFor={`edit-star${star}-${commentItem.id}`}
                                style={{ cursor: 'pointer', fontSize: '1.4rem', color: editRating >= star ? '#f5a623' : '#ccc' }}>★</label>
                            </React.Fragment>
                          ))}
                        </div>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)}
                          style={{ width: '100%', minHeight: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical', fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingId(null)}
                            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>إلغاء</button>
                          <button onClick={() => handleEditComment(commentItem.id)}
                            style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#1a56db', color: '#fff', cursor: 'pointer' }}>حفظ</button>
                        </div>
                      </div>
                    ) : (
                      <p className="pp-comment-text">{commentItem.text}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {hasMore && (
              <div className="pp-load-more-container">
                <button className="pp-load-more-btn" onClick={loadMoreComments} disabled={commentsLoading}>
                  {commentsLoading ? 'جاري التحميل...' : 'إظهار المزيد'}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Cart Toast ── */}
      {showCartToast && (
        <div className="pp-cart-toast-overlay" onClick={() => setShowCartToast(false)}>
          <div className="pp-cart-toast" onClick={e => e.stopPropagation()}>
            <div className="pp-cart-toast-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="pp-cart-toast-msg">تمت الإضافة إلى السلة! 🛒</p>
            <div className="pp-cart-toast-actions">
              <button
                className="pp-toast-continue"
                onClick={() => setShowCartToast(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                متابعة التسوق
              </button>
              <button
                className="pp-toast-go-cart"
                onClick={() => { setShowCartToast(false); navigate('/cart'); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                عرض السلة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductPage;