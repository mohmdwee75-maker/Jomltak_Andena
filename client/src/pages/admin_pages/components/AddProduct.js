// src/pages/admin/components/AddProduct.js
import React, { useState, useRef, useCallback } from 'react';

const API = 'http://localhost:5000';

const INITIAL_FORM = {
  name: '', description: '', price: '', oldPrice: '',
  discount: '', rating: '', reviewsCount: '',
  minQuantity: '', category: '', brand: '', stock: '',
};

export default function AddProduct({ setView }) {
  const fileInputRef = useRef(null);
  const [form, setForm]           = useState(INITIAL_FORM);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [dragging, setDragging]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

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

  const addFiles = useCallback((files) => {
    const allowed = Array.from(files).filter(
      f => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    const previews = allowed.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));
    setMediaFiles(prev => [...prev, ...previews].slice(0, 10));
  }, []);

  const removeMedia = (idx) => {
    setMediaFiles(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name.trim())        return setError('اسم المنتج مطلوب');
    if (!form.price)              return setError('السعر مطلوب');
    if (mediaFiles.length === 0)  return setError('أضف صورة واحدة على الأقل');

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      mediaFiles.forEach(({ file }) => fd.append('media', file));

      const res  = await fetch(`${API}/api/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`✅ تم إضافة المنتج "${data.product.name}" بنجاح! رقمه: ${data.product.productId}`);
        setForm(INITIAL_FORM);
        setMediaFiles([]);
        setTimeout(() => setView({ name: 'products' }), 2000);
      } else {
        setError(data.error || data.message || 'حدث خطأ أثناء الإضافة');
      }
    } catch {
      setError('مش قادر يتصل بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ap-main">
      <header className="ap-header">
        <div>
          <h1 className="ap-title">إضافة منتج جديد</h1>
          <p className="ap-subtitle">املأ البيانات وارفع الصور — السيرفر هيرفعها على Cloudinary تلقائياً</p>
        </div>
        <button className="ap-back-btn" onClick={() => setView({ name: 'products' })}>
          <i className="fa-solid fa-arrow-right"></i> رجوع
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
              <input name="name" value={form.name} onChange={handleChange} placeholder="مثال: سماعات لاسلكية Pro X" required />
            </div>
            <div className="ap-field">
              <label>الوصف</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="اكتب وصف تفصيلي للمنتج..." rows={4} />
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
                  <input name="price" type="number" min="0" value={form.price} onChange={handleChange} placeholder="0" required />
                </div>
              </div>
              <div className="ap-field">
                <label>السعر قبل الخصم</label>
                <div className="ap-input-prefix">
                  <span>ج.م</span>
                  <input name="oldPrice" type="number" min="0" value={form.oldPrice} onChange={handleChange} placeholder="0" />
                </div>
              </div>
            </div>
            <div className="ap-field">
              <label>الخصم</label>
              <div className="ap-discount-field">
                <input name="discount" value={form.discount} onChange={handleChange} placeholder="محسوب تلقائياً أو اكتبه يدوياً" />
                {form.discount && <span className="ap-discount-badge">{form.discount}</span>}
              </div>
              <small className="ap-hint">بيتحسب تلقائياً لما تدخل السعرين</small>
            </div>
            <div className="ap-row2">
              <div className="ap-field">
                <label>المخزون</label>
                <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} placeholder="0" />
              </div>
              <div className="ap-field">
                <label>الحد الأدنى للطلب</label>
                <input name="minQuantity" type="number" min="1" value={form.minQuantity} onChange={handleChange} placeholder="1" />
              </div>
            </div>
            <div className="ap-row2">
              <div className="ap-field">
                <label>التقييم</label>
                <input name="rating" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={handleChange} placeholder="0 - 5" />
              </div>
              <div className="ap-field">
                <label>عدد التقييمات</label>
                <input name="reviewsCount" type="number" min="0" value={form.reviewsCount} onChange={handleChange} placeholder="0" />
              </div>
            </div>
          </section>

          {/* الميديا */}
          <section className="ap-card ap-card-full">
            <h2 className="ap-card-title"><i className="fa-solid fa-images"></i> الصور والفيديو (max 10)</h2>
            <div
              className={`ap-dropzone ${dragging ? 'ap-dropzone-active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fa-solid fa-cloud-arrow-up"></i>
              <p>اسحب الصور والفيديوهات هنا أو <span>اضغط للاختيار</span></p>
              <small>PNG, JPG, WEBP, MP4 — بحد أقصى 10 ملفات</small>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={e => addFiles(e.target.files)}
              />
            </div>
            {mediaFiles.length > 0 && (
              <div className="ap-preview-grid">
                {mediaFiles.map((m, i) => (
                  <div key={i} className="ap-preview-item">
                    {m.type === 'video'
                      ? <video src={m.preview} muted className="ap-preview-media" />
                      : <img src={m.preview} alt="" className="ap-preview-media" />
                    }
                    <div className="ap-preview-overlay">
                      <span className="ap-preview-type">{m.type === 'video' ? '🎬' : '🖼️'}</span>
                      <button type="button" className="ap-preview-remove" onClick={() => removeMedia(i)}>
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                    {i === 0 && <span className="ap-preview-main-badge">رئيسية</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="ap-submit-bar">
          <div className="ap-submit-info">
            <span>{mediaFiles.length} / 10 ملفات</span>
            {form.price    && <span>السعر: {Number(form.price).toLocaleString('ar-EG')} ج.م</span>}
            {form.discount && <span className="ap-discount-badge">{form.discount} خصم</span>}
          </div>
          <button type="submit" className="ap-submit-btn" disabled={loading}>
            {loading
              ? <><span className="ap-spinner"></span> جاري الرفع على Cloudinary...</>
              : <><i className="fa-solid fa-cloud-arrow-up"></i> إضافة المنتج</>
            }
          </button>
        </div>
      </form>
    </main>
  );
}
