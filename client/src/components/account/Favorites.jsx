import React, { useState, useEffect } from 'react';
import './Favorites.css';
import { Link } from 'react-router-dom';

const Favorites = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = localStorage.getItem("token");
      if (!token) { setLoading(false); return; }

      try {
        const res = await fetch('https://jomltak-andena-server-production.up.railway.app/api/wishlist', {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        setWishlist(data.wishlist || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, []);

  // دالة إزالة من المفضلة
  const handleRemove = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch('https://jomltak-andena-server-production.up.railway.app/api/wishlist/remove', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });
      if (res.ok) {
        setWishlist(prev => prev.filter(id => id !== productId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  // ── شاشة فاضية ──
  if (wishlist.length === 0) {
    return (
      <div className="empty-favorites">
        <div className="heart-icon">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="60" fill="#b4d3ec"/>
            <path d="M60 85L35 60c-5-5-5-13 0-18s13-5 18 0l7 7 7-7c5-5 13-5 18 0s5 13 0 18L60 85z"
                  fill="#238fe7" stroke="#306591" strokeWidth="3"/>
          </svg>
        </div>
        <h2 className="empty-title">لم تحفظ المنتج</h2>
        <p className="empty-description">
          هل رأيت منتج أعجبك؟ اضغط على رمز الاعجاب لحفظه في قائمة الحفظ.<br/>
          ستظهر جميع المنتجات المحفوظة هنا.
        </p>
        <Link to="/" className="shop-now-link">
          <button className="shop-now-btn">متابعة التسوق</button>
        </Link>
      </div>
    );
  }

  // ── شاشة فيها منتجات ──
  // ⚠️ دي بيانات مؤقتة لحد ما تعمل Products collection في DB
  const allProducts = [
    { id: 1, name: 'ماكينة صيد معدنية - مقاس 5000', price: 550, originalPrice: null, discount: 0, rating: 4, reviews: 4, image: "/assets/images/3.png" },
    { id: 2, name: 'ماكينة تحضير قهوة إسبريسو محمولة...', price: 1250, originalPrice: 1750, discount: 29, rating: 5, reviews: 119, image: "/assets/images/3.png", freeShipping: true, freeShippingMin: 1250 },
    { id: 3, name: 'خطاف صيد بطول 1.80 م مع ماكينة', price: 350, originalPrice: null, discount: 0, rating: 0, reviews: 0, image: "/assets/images/3.png" },
    { id: 4, name: 'Bosch ماكينة مطبخ بوش - 900 وات...', price: 14499, originalPrice: 16999, discount: 15, rating: 0, reviews: 0, image: "/assets/images/3.png" },
    { id: 5, name: 'خيط صيد نايلون عالي الجودة', price: 120, originalPrice: 150, discount: 20, rating: 4, reviews: 45, image: "/assets/images/3.png" },
    { id: 6, name: 'نظارات صيد بولاريزد للرجال', price: 450, originalPrice: 600, discount: 25, rating: 5, reviews: 78, image: "/assets/images/3.png" },
    { id: 7, name: 'عصا صيد كربون فايبر للسيدات', price: 890, originalPrice: null, discount: 0, rating: 4, reviews: 23, image: "/assets/images/3.png" },
    { id: 8, name: 'طقم اكسسوارات صيد للأطفال', price: 280, originalPrice: 350, discount: 20, rating: 5, reviews: 156, image: "/assets/images/3.png" },
  ];

  const favoriteProducts = allProducts.filter(p => wishlist.includes(p.id));

  return (
    <div className="favorites-page">
      <h2 className="favorites-title">المفضلة ({favoriteProducts.length})</h2>
      <div className="products-grid">
        {favoriteProducts.map(product => (
          <Link to={`/product/${product.id}`} key={product.id} className="product-card-link">
            <div className="product-card">
              <div className="product-image-container">
                <img src={product.image} alt={product.name} />

                {/* زر القلب - يشيل من المفضلة */}
                <button
                  className="wishlist-btn active"
                  onClick={(e) => handleRemove(e, product.id)}
                >
                  <i className="fa-solid fa-heart"></i>
                </button>

                {product.discount > 0 && (
                  <span className="discount-badge">-{product.discount}%</span>
                )}
              </div>

              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <div className="product-pricing">
                  <span className="current-price">جنيه {product.price.toFixed(2)}</span>
                  {product.originalPrice && (
                    <span className="original-price">جنيه {product.originalPrice.toFixed(2)}</span>
                  )}
                </div>
                {product.rating > 0 && (
                  <div className="product-rating">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className={`fa-solid fa-star ${i < product.rating ? 'filled' : ''}`}></i>
                      ))}
                    </div>
                    <span className="reviews-count">({product.reviews})</span>
                  </div>
                )}
                {product.freeShipping && (
                  <div className="free-shipping">
                    <i className="fa-solid fa-truck"></i>
                    <span>شحن مجاني من {product.freeShippingMin.toFixed(2)} جنيه</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Favorites;