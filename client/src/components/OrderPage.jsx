import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import './OrderPage.css';

export default function OrderPage() {
  const { state }  = useLocation();
  const navigate   = useNavigate();

  // ── ممكن تيجي من السلة أو من صفحة منتج واحد ──
  const cartItems  = state?.cartItems  || [];
  const singleProduct = state?.product || null;

  // لو جاي من صفحة منتج واحد، حوّله لنفس شكل السلة
  const [items, setItems] = useState(() => {
    if (cartItems.length > 0) return cartItems;
    if (singleProduct) return [{
      id:          singleProduct.productId,
      productId:   singleProduct.productId,
      name:        singleProduct.name,
      price:       singleProduct.price,
      image:       singleProduct.media?.[0]?.url || '',
      quantity:    singleProduct.minQuantity || 1,
      minQuantity: singleProduct.minQuantity || 1,
    }];
    return [];
  });

  const [form, setForm] = useState({
    fullName: "", phone: "", street: "", building: "",
    city: "", district: "", governorate: "", landmark: "",
    addressType: "home", requestedDate: "", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const updateQty = (id, delta) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const min = item.minQuantity || 1;
      const newQty = Math.max(min, item.quantity + delta);
      return { ...item, quantity: newQty };
    }));
  };

  const handleSubmit = async () => {
    if (!form.fullName || !form.phone || !form.street || !form.city || !form.governorate || !form.requestedDate) {
      setError("من فضلك اكمل كل الحقول المطلوبة (*)");
      return;
    }
    if (items.length === 0) {
      setError("لا يوجد منتجات في الطلب");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        'https://jomltak-andena-server-production.up.railway.app/api/orders',
        {
          items: items.map(i => ({ productId: i.productId || i.id, quantity: i.quantity })),
          deliveryInfo: {
            ...form,
            address: `${form.street}${form.building ? ' - ' + form.building : ''}`,
          }
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );
      navigate("/order-success");
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) return (
    <div className="order-page">
      <div className="order-container">
        <p style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>لا يوجد منتجات في الطلب</p>
      </div>
    </div>
  );

  return (
    <div className="order-page">
      <div className="order-container">

        {/* العنوان */}
        <div className="order-header">
          <h1 className="order-title">تأكيد الطلب</h1>
        </div>

        {/* ملخص المنتجات */}
        <div className="order-card">
          <h3 className="order-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            ملخص الطلب ({items.length} {items.length === 1 ? 'منتج' : 'منتجات'})
          </h3>

          <div className="order-items-list">
            {items.map(item => (
              <div key={item.id} className="order-item-row">
                <img src={item.image} alt={item.name} className="order-item-img" />
                <div className="order-item-info">
                  <p className="order-item-name">{item.name}</p>
                  <p className="order-item-price">{item.price?.toLocaleString()} جنيه / وحدة</p>
                </div>
                <div className="quantity-controls">
                  <button className="qty-btn"
                    onClick={() => updateQty(item.id, -1)}
                    disabled={item.quantity <= (item.minQuantity || 1)}>−</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                </div>
                <p className="order-item-subtotal">{(item.price * item.quantity).toLocaleString()} جنيه</p>
              </div>
            ))}
          </div>

          <div className="order-total-bar">
            <span className="order-total-label">إجمالي الطلب:</span>
            <span className="order-total-value">{totalPrice.toLocaleString()} جنيه</span>
          </div>
        </div>

        {/* بيانات التوصيل */}
        <div className="order-card">
          <h3 className="order-card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            إضافة عنوان شحن
          </h3>

          <div className="delivery-form">

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الاسم بالكامل <span className="required">*</span></label>
                <input type="text" className={`form-input ${error && !form.fullName ? 'error' : ''}`}
                  placeholder="محمد أحمد" value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الهاتف <span className="required">*</span></label>
                <input type="tel" className={`form-input ${error && !form.phone ? 'error' : ''}`}
                  placeholder="01xxxxxxxxx" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">اسم الشارع <span className="required">*</span></label>
                <input type="text" className={`form-input ${error && !form.street ? 'error' : ''}`}
                  placeholder="شارع طلعت حرب" value={form.street}
                  onChange={e => setForm(f => ({ ...f, street: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">اسم / رقم المبنى</label>
                <input type="text" className="form-input"
                  placeholder="اسم المبنى أو رقمه" value={form.building}
                  onChange={e => setForm(f => ({ ...f, building: e.target.value }))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">المدينة / المنطقة <span className="required">*</span></label>
                <input type="text" className={`form-input ${error && !form.city ? 'error' : ''}`}
                  placeholder="القاهرة الجديدة..." value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">الحي</label>
                <input type="text" className="form-input"
                  placeholder="اسم الحي" value={form.district}
                  onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">المحافظة <span className="required">*</span></label>
                <select className={`form-input form-select ${error && !form.governorate ? 'error' : ''}`}
                  value={form.governorate}
                  onChange={e => setForm(f => ({ ...f, governorate: e.target.value }))}>
                  <option value="">اختر المحافظة</option>
                  {["القاهرة","الجيزة","الإسكندرية","الدقهلية","البحر الأحمر",
                    "البحيرة","الفيوم","الغربية","الإسماعيلية","المنوفية",
                    "المنيا","القليوبية","الوادي الجديد","السويس","أسوان",
                    "أسيوط","بني سويف","بورسعيد","دمياط","الشرقية",
                    "جنوب سيناء","كفر الشيخ","مطروح","الأقصر","قنا",
                    "شمال سيناء","سوهاج"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">أقرب معلم</label>
                <input type="text" className="form-input"
                  placeholder="كارفور فيستيفال سيتي" value={form.landmark}
                  onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} />
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">نوع العنوان</label>
              <div className="address-type-group">
                <label className={`address-type-option ${form.addressType === 'home' ? 'selected' : ''}`}>
                  <input type="radio" name="addressType" value="home"
                    checked={form.addressType === 'home'}
                    onChange={() => setForm(f => ({ ...f, addressType: 'home' }))} />
                  🏠 منزل (7 صباحاً - 9 مساءً، كل الأيام)
                </label>
                <label className={`address-type-option ${form.addressType === 'office' ? 'selected' : ''}`}>
                  <input type="radio" name="addressType" value="office"
                    checked={form.addressType === 'office'}
                    onChange={() => setForm(f => ({ ...f, addressType: 'office' }))} />
                  🏢 مكتب (الأحد إلى الخميس)
                </label>
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">تاريخ التسليم المطلوب <span className="required">*</span></label>
              <input type="date" className={`form-input ${error && !form.requestedDate ? 'error' : ''}`}
                value={form.requestedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(f => ({ ...f, requestedDate: e.target.value }))} />
            </div>

            <div className="form-group full-width">
              <label className="form-label">ملاحظات إضافية</label>
              <textarea className="form-textarea" placeholder="أي تعليمات خاصة للتوصيل..." rows={3}
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {error && (
              <div className="form-error-msg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button className="confirm-order-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? "جاري الإرسال..." : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  تأكيد الطلب
                </>
              )}
            </button>

            <div className="order-guarantees">
              <div className="guarantee-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>دفع آمن 100%</span>
              </div>
              <div className="guarantee-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                </svg>
                <span>شحن سريع</span>
              </div>
              <div className="guarantee-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <span>إرجاع خلال 14 يوم</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}