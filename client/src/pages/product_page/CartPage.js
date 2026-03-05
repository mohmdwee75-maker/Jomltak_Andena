import React, { useState } from 'react';
import { useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import './CartPage.css';

const CartPage = () => {
  const navigate = useNavigate();
  // البيانات الافتراضية للمنتجات في السلة
  const [cartItems, setCartItems] = useState(() => {
  const saved = localStorage.getItem('cart');
  return saved ? JSON.parse(saved) : [];
});
useEffect(() => {
  localStorage.setItem('cart', JSON.stringify(cartItems));
}, [cartItems]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [showPromoError, setShowPromoError] = useState(false);

  // أكواد الخصم المتاحة
  const promoCodes = {
    'SAVE10': { discount: 10, type: 'percentage', description: 'خصم 10%' },
    'SAVE50': { discount: 50, type: 'fixed', description: 'خصم 50 جنيه' },
    'WELCOME': { discount: 15, type: 'percentage', description: 'خصم 15% للعملاء الجدد' }
  };

  // زيادة الكمية
  const increaseQuantity = (id) => {
    setCartItems(cartItems.map(item => {
      if (item.id === id && item.quantity < item.maxQuantity) {
        return { ...item, quantity: item.quantity + 1 };
      }
      return item;
    }));
  };

  // تقليل الكمية
  const decreaseQuantity = (id) => {
    setCartItems(cartItems.map(item => {
      if (item.id === id && item.quantity > 1) {
        return { ...item, quantity: item.quantity - 1 };
      }
      return item;
    }));
  };

  // حذف منتج
  const removeItem = (id) => {
    if (window.confirm('هل تريد حذف هذا المنتج من السلة؟')) {
      setCartItems(cartItems.filter(item => item.id !== id));
    }
  };

  // تطبيق كود الخصم
  const applyPromoCode = () => {
    const code = promoCode.toUpperCase();
    if (promoCodes[code]) {
      setAppliedPromo({ code, ...promoCodes[code] });
      setShowPromoError(false);
      setPromoCode('');
    } else {
      setShowPromoError(true);
      setTimeout(() => setShowPromoError(false), 3000);
    }
  };

  // إزالة كود الخصم
  const removePromoCode = () => {
    setAppliedPromo(null);
  };

  // حساب المجموع الفرعي
  const subtotal = cartItems.reduce((sum, item) => {
    if (item.inStock) {
      return sum + (item.price * item.quantity);
    }
    return sum;
  }, 0);

  // حساب الخصم من الكود الترويجي
  const promoDiscount = appliedPromo 
    ? appliedPromo.type === 'percentage' 
      ? (subtotal * appliedPromo.discount) / 100 
      : appliedPromo.discount
    : 0;

  // رسوم الشحن
  const shippingFee = subtotal > 500 ? 0 : 50;

  // الإجمالي النهائي
  const total = subtotal - promoDiscount + shippingFee;

  // إجمالي التوفير
  const totalSavings = cartItems.reduce((sum, item) => {
    if (item.inStock && item.oldPrice) {
      return sum + ((item.oldPrice - item.price) * item.quantity);
    }
    return sum;
  }, 0) + promoDiscount;

  return (
    <div className="cart-page">
      <div className="cart-container">
        
        {/* العنوان الرئيسي */}
        <div className="cart-header">
          <h1 className="cart-title">سلة التسوق</h1>
          <span className="cart-count">({cartItems.length} منتج)</span>
        </div>

        {cartItems.length === 0 ? (
          // سلة فارغة
          <div className="empty-cart">
            <svg className="empty-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <h2>سلة التسوق فارغة</h2>
            <p>لم تقم بإضافة أي منتجات بعد</p>
            <button className="continue-shopping-btn" onClick={() => window.history.back()}>
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="cart-content">
            
            {/* قائمة المنتجات */}
            <div className="cart-items-section">
              
              {/* رسالة المنتجات غير المتوفرة */}
              {cartItems.some(item => !item.inStock) && (
                <div className="out-of-stock-alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>بعض المنتجات غير متوفرة حالياً</span>
                </div>
              )}

              {/* المنتجات */}
              <div className="cart-items-list">
                {cartItems.map(item => (
                  <div key={item.id} className={`cart-item ${!item.inStock ? 'out-of-stock' : ''}`}>
                    
                    {/* صورة المنتج */}
                    <div className="item-image-container">
                      <img src={item.image} alt={item.name} className="item-image" />
                      {!item.inStock && <div className="out-of-stock-badge">غير متوفر</div>}
                    </div>

                    {/* معلومات المنتج */}
                    <div className="item-details">
                      <h3 className="item-name">{item.name}</h3>
                      
                      <div className="item-price-info">
                        <span className="item-price">{item.price.toLocaleString()} جنيه</span>
                        {item.oldPrice && (
                          <>
                            <span className="item-old-price">{item.oldPrice.toLocaleString()} جنيه</span>
                            <span className="item-discount-badge">خصم {item.discount}%</span>
                          </>
                        )}
                      </div>

                      {item.inStock && (
                        <div className="item-stock-info">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>متوفر في المخزن</span>
                        </div>
                      )}
                    </div>

                    {/* التحكم في الكمية */}
                    {item.inStock ? (
                      <div className="item-quantity-controls">
                        <button 
                          className="quantity-btn"
                          onClick={() => decreaseQuantity(item.id)}
                          disabled={item.quantity <= 1}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                        <span className="quantity-display">{item.quantity}</span>
                        <button 
                          className="quantity-btn"
                          onClick={() => increaseQuantity(item.id)}
                          disabled={item.quantity >= item.maxQuantity}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="item-unavailable">غير متوفر</div>
                    )}

                    {/* السعر الإجمالي */}
                    <div className="item-total-price">
                      {(item.price * item.quantity).toLocaleString()} جنيه
                    </div>

                    {/* زر الحذف */}
                    <button className="remove-item-btn" onClick={() => removeItem(item.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* أزرار الإجراءات */}
              <div className="cart-actions">
                <button className="clear-cart-btn" onClick={() => {
                  if (window.confirm('هل تريد حذف جميع المنتجات من السلة؟')) {
                    setCartItems([]);
                  }
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  إفراغ السلة
                </button>
                <button className="continue-shopping-btn-secondary" onClick={() => window.history.back()}>
                  متابعة التسوق
                </button>
              </div>
            </div>

            {/* ملخص الطلب */}
            <div className="order-summary">
              <h2 className="summary-title">ملخص الطلب</h2>

              {/* كود الخصم */}
              <div className="promo-code-section">
                <h3 className="promo-title">كود الخصم</h3>
                {appliedPromo ? (
                  <div className="applied-promo">
                    <div className="applied-promo-info">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <div>
                        <span className="promo-code-text">{appliedPromo.code}</span>
                        <span className="promo-description">{appliedPromo.description}</span>
                      </div>
                    </div>
                    <button className="remove-promo-btn" onClick={removePromoCode}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="promo-input-container">
                    <input
                      type="text"
                      className="promo-input"
                      placeholder="أدخل كود الخصم"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && applyPromoCode()}
                    />
                    <button className="apply-promo-btn" onClick={applyPromoCode}>
                      تطبيق
                    </button>
                  </div>
                )}
                {showPromoError && (
                  <div className="promo-error">كود الخصم غير صحيح</div>
                )}
                <div className="promo-suggestions">
                  <span>أكواد متاحة: SAVE10, SAVE50, WELCOME</span>
                </div>
              </div>

              {/* تفاصيل السعر */}
              <div className="price-details">
                <div className="price-row">
                  <span>المجموع الفرعي:</span>
                  <span>{subtotal.toLocaleString()} جنيه</span>
                </div>

                {appliedPromo && (
                  <div className="price-row discount-row">
                    <span>الخصم ({appliedPromo.description}):</span>
                    <span className="discount-amount">- {promoDiscount.toLocaleString()} جنيه</span>
                  </div>
                )}

                <div className="price-row">
                  <span>رسوم الشحن:</span>
                  <span className={shippingFee === 0 ? 'free-shipping' : ''}>
                    {shippingFee === 0 ? 'مجاناً' : `${shippingFee} جنيه`}
                  </span>
                </div>

                {shippingFee > 0 && (
                  <div className="shipping-note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>أضف {(500 - subtotal).toLocaleString()} جنيه للحصول على شحن مجاني</span>
                  </div>
                )}

                {totalSavings > 0 && (
                  <div className="savings-row">
                    <span>إجمالي التوفير:</span>
                    <span className="savings-amount">{totalSavings.toLocaleString()} جنيه</span>
                  </div>
                )}

                <div className="total-row">
                  <span>الإجمالي:</span>
                  <span className="total-amount">{total.toLocaleString()} جنيه</span>
                </div>
              </div>

              {/* زر الدفع */}
              <button className="checkout-btn" onClick={() => {
  const token = localStorage.getItem('token');
  if (!token) {
    navigate('/sign-in');
    return;
  }
  navigate('/order', {
    state: {
      cartItems,
      total
    }
  });
}}>
                إتمام الطلب
              </button>


              {/* طرق الدفع المتاحة */}
              <div className="payment-methods">
                <span className="payment-title">طرق الدفع المتاحة:</span>
                <div className="payment-icons">
                  <div className="payment-icon">💳</div>
                  <div className="payment-icon">📱</div>
                  <div className="payment-icon">💵</div>
                </div>
              </div>

              {/* الضمانات */}
              <div className="guarantees">
                <div className="guarantee-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  <span>دفع آمن 100%</span>
                </div>
                <div className="guarantee-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  </svg>
                  <span>شحن سريع</span>
                </div>
                <div className="guarantee-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  <span>إرجاع مجاني</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
