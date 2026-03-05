// src/pages/admin/components/EditProduct.js
import React, { useState, useRef, useCallback, useEffect } from 'react';

const API = 'http://localhost:5000';

export default function EditProduct({ productId, setView }) {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '', description: '', price: '', oldPrice: '',
    discount: '', rating: '', reviewsCount: '',
    minQuantity: '', category: '', brand: '', stock: '',
  });
  const [existingMedia, setExistingMedia] = useState([]);
  const [newMediaFiles, setNewMediaFiles] = useState([]);
  const [dragging, setDragging]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [fetchLoading, setFetchLoading]   = useState(true);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');

  // ─── Fetch المنتج ──────────────────────────────────────────
  useEffect(() => {
    const fetchProduct = async () => {
      setFetchLoading(true);
      try {
        const res  = await fetch(`${API}/api/products/${productId}`);
        const data = await res.json();
        if (res.ok) {
          setForm({
            name:         data.name         || '',
            description:  data.description  || '',
            price:        data.price        ?? '',
            oldPrice:     data.oldPrice     ?? '',
            discount:     data.discount     || '',
            rating:       data.rating       ?? '',
            reviewsCount: data.reviewsCount ?? '',
            minQuantity:  data.minQuantity  ?? '',
            category:     data.category     || '',
            brand:        data.brand        || '',
            stock:        data.stock        ?? '',
          });
          setExistingMedia((data.media || []).map(m => ({ ...m, toDelete: false })));
        } else {
          setError('المنتج مش موجود');
        }
      } catch {
        setError('فشل الاتصال بالسيرفر');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  // ─── Helpers ───────────────────────────────────────────────
  const calcDiscount = (price, oldPrice) => {
    if (!price || !oldPrice || Number(oldPrice) === 0) return '';
    const disc = Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100);
    return disc > 0 ? `${disc}%` : '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'price' || name === 'oldPrice') {
        updated.discount = calcDiscount(
          name === 'price'    ? value : prev.price,
          name === 'oldPrice' ? value : prev.oldPrice
        );
      }
      return updated;
    });
    setError('');
  };

  const toggleDeleteExisting = (idx) => {
    setExistingMedia(prev =>
      prev.map((m, i) => i === idx ? { ...m, toDelete: !m.toDelete } : m)
    );
  };

  const addFiles = useCallback((files) => {
    const allowed = Array.from(files).filter(
      f => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    const previews = allowed.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));
    const totalExisting = existingMedia.filter(m => !m.toDelete).length;
    setNewMediaFiles(prev => [...prev, ...previews].slice(0, 10 - totalExisting));
  }, [existingMedia]);

  const removeNewMedia = (idx) => {
    setNewMediaFiles(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const totalMedia = existingMedia.filter(m => !m.toDelete).length + newMediaFiles.length;

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name.trim()) return setError('اسم المنتج مطلوب');
    if (!form.price)       return setError('السعر مطلوب');
    const keepMedia = existingMedia.filter(m => !m.toDelete);
    if (keepMedia.length === 0 && newMediaFiles.length === 0)
      return setError('لازم يكون في صورة واحدة على الأقل');

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const fd    = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });

      const toDeleteIds = existingMedia.filter(m => m.toDelete).map(m => m.publicId);
      if (toDeleteIds.length > 0)
        fd.append('deleteMediaIds', JSON.stringify(toDeleteIds));

      fd.append('keepMediaIds', JSON.stringify(keepMedia.map(m => m.publicId)));
      newMediaFiles.forEach(({ file }) => fd.append('media', file));

      const res  = await fetch(`${API}/api/products/${productId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('✅ تم تحديث المنتج بنجاح!');
        setTimeout(() => setView({ name: 'products' }), 1500);
      } else {
        setError(data.error || data.message || 'حدث خطأ أثناء التحديث');
      }
    } catch {
      setError('فشل الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading screen ────────────────────────────────────────
  if (fetchLoading) return (
    <main className="ap-main">
      <div className="ep-loading">
        <span className="ep-spinner-lg"></span>
        <p>جاري تحميل المنتج...</p>
      </div>
    </main>
  );

  return (
    <main className="ap-main">
      <header className="ap-header">
        <div>
          <h1 className="ap-title">
            تعديل المنتج
            <span className="ep-product-id-badge">#{productId}</span>
          </h1>
          <p className="ap-subtitle">عدّل البيانات واضغط حفظ</p>
        </div>
        <button className="ap-back-btn" onClick={() => setView({ name: 'products' })}>
          <i className="fa-solid fa-arrow-right"></i> رجوع للمنتجات
        </button>
      </header>

      {error   && <div className="ap-alert ap-alert-error">  <i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}
      {success && <div className="ap-alert ap-alert-success"><i className="fa-solid fa-circle-check"></i> {success}</div>}

      <form onSubmit={handleSubmit} className="ap-form">
        <div className="ap-grid">

          {/* البيانات الأساسية */}
          <section className="ap-card">
            <h2 className="ap-card-title"><i className="fa-solid fa-tag"></i> البيانات الأساسية</h2>
            <div className="ap-field">
              <label>اسم المنتج <span className="ap-req">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="اسم المنتج" required />
            </div>
            <div className="ap-field">
              <label>الوصف</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} placeholder="وصف تفصيلي..." />
            </div>
            <div className="ap-field">
              <label>الفئة</label>
              <input name="category" value={form.category} onChange={handleChange} placeholder="مثال: إلكترونيات" />
            </div>
            <div className="ap-field">
              <label>الماركة / البراند</label>
              <input name="brand" value={form.brand} onChange={handleChange} placeholder="مثال: Samsung" />
            </div>
          </section>

          {/* التسعير والمخزون */}
          <section className="ap-card">
            <h2 className="ap-card-title"><i className="fa-solid fa-egyptian-pound-sign"></i> التسعير والمخزون</h2>
            <div className="ap-row2">
              <div className="ap-field">
                <label>السعر الحالي <span className="ap-req">*</span></label>
                <div className="ap-input-prefix">
                  <span>ج.م</span>
                  <input name="price" type="number" min="0" value={form.price} onChange={handleChange} required />
                </div>
              </div>
              <div className="ap-field">
                <label>السعر قبل الخصم</label>
                <div className="ap-input-prefix">
                  <span>ج.م</span>
                  <input name="oldPrice" type="number" min="0" value={form.oldPrice} onChange={handleChange} />
                </div>
              </div>
            </div>
            <div className="ap-field">
              <label>الخصم</label>
              <div className="ap-discount-field">
                <input name="discount" value={form.discount} onChange={handleChange} placeholder="محسوب تلقائياً" />
                {form.discount && <span className="ap-discount-badge">{form.discount}</span>}
              </div>
              <small className="ap-hint">بيتحسب تلقائياً لما تدخل السعرين</small>
            </div>
            <div className="ap-row2">
              <div className="ap-field">
                <label>المخزون</label>
                <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} />
              </div>
              <div className="ap-field">
                <label>الحد الأدنى للطلب</label>
                <input name="minQuantity" type="number" min="1" value={form.minQuantity} onChange={handleChange} />
              </div>
            </div>
            <div className="ap-row2">
              <div className="ap-field">
                <label>التقييم</label>
                <input name="rating" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={handleChange} placeholder="0 - 5" />
              </div>
              <div className="ap-field">
                <label>عدد التقييمات</label>
                <input name="reviewsCount" type="number" min="0" value={form.reviewsCount} onChange={handleChange} />
              </div>
            </div>
          </section>

          {/* الميديا */}
          <section className="ap-card ap-card-full">
            <h2 className="ap-card-title">
              <i className="fa-solid fa-images"></i>
              الصور والفيديو
              <span className="ep-media-count">{totalMedia} / 10</span>
            </h2>

            {/* الصور الموجودة */}
            {existingMedia.length > 0 && (
              <div className="ep-existing-section">
                <p className="ep-section-label">
                  <i className="fa-solid fa-cloud"></i>
                  الصور الحالية على Cloudinary — اضغط على الصورة عشان تحددها للحذف
                </p>
                <div className="ap-preview-grid">
                  {existingMedia.map((m, i) => (
                    <div
                      key={m.publicId}
                      className={`ap-preview-item ep-existing-item ${m.toDelete ? 'ep-marked-delete' : ''}`}
                      onClick={() => toggleDeleteExisting(i)}
                      title={m.toDelete ? 'اضغط للإلغاء' : 'اضغط لتحديد للحذف'}
                    >
                      {m.type === 'video'
                        ? <video src={m.url} muted className="ap-preview-media" />
                        : <img src={m.url} alt={m.alt} className="ap-preview-media" />
                      }
                      {m.toDelete && (
                        <div className="ep-delete-overlay">
                          <i className="fa-solid fa-trash"></i>
                          <span>هيتحذف</span>
                        </div>
                      )}
                      {i === 0 && !m.toDelete && <span className="ap-preview-main-badge">رئيسية</span>}
                    </div>
                  ))}
                </div>
                {existingMedia.some(m => m.toDelete) && (
                  <p className="ep-delete-warning">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    {existingMedia.filter(m => m.toDelete).length} صورة هتتحذف من Cloudinary عند الحفظ
                  </p>
                )}
              </div>
            )}

            {/* Dropzone */}
            <div
              className={`ap-dropzone ${dragging ? 'ap-dropzone-active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fa-solid fa-cloud-arrow-up"></i>
              <p>اسحب صور جديدة هنا أو <span>اضغط للاختيار</span></p>
              <small>PNG, JPG, WEBP, MP4</small>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={e => addFiles(e.target.files)}
              />
            </div>

            {/* صور جديدة */}
            {newMediaFiles.length > 0 && (
              <div className="ep-new-section">
                <p className="ep-section-label">
                  <i className="fa-solid fa-plus"></i> صور جديدة هتتضاف
                </p>
                <div className="ap-preview-grid">
                  {newMediaFiles.map((m, i) => (
                    <div key={i} className="ap-preview-item">
                      {m.type === 'video'
                        ? <video src={m.preview} muted className="ap-preview-media" />
                        : <img src={m.preview} alt="" className="ap-preview-media" />
                      }
                      <div className="ap-preview-overlay">
                        <span className="ap-preview-type">{m.type === 'video' ? '🎬' : '🖼️'}</span>
                        <button type="button" className="ap-preview-remove" onClick={() => removeNewMedia(i)}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Submit */}
        <div className="ap-submit-bar">
          <div className="ap-submit-info">
            <span>{totalMedia} / 10 ميديا</span>
            {form.price    && <span>السعر: {Number(form.price).toLocaleString('ar-EG')} ج.م</span>}
            {form.discount && <span className="ap-discount-badge">{form.discount} خصم</span>}
          </div>
          <button type="submit" className="ap-submit-btn" disabled={loading}>
            {loading
              ? <><span className="ap-spinner"></span> جاري الحفظ...</>
              : <><i className="fa-solid fa-floppy-disk"></i> حفظ التغييرات</>
            }
          </button>
        </div>
      </form>
    </main>
  );
}
