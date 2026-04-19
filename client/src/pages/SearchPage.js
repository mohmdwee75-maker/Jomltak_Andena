import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import HeroSection from '../components/HeroSection.module';
import Footer from '../components/Footer.module';
import ScrollToTop from '../components/ScrollToTop.module';
import '../../src/components/ProductSection3.css'; // نفس CSS صفحة المنتجات

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  const [priceRange, setPriceRange]             = useState({ min: 100, max: 16999 });
  const [selectedSort, setSelectedSort]         = useState('مشهور');
  const [selectedBrands, setSelectedBrands]     = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [allProducts, setAllProducts]           = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [searched, setSearched]                 = useState(false);

  const sortOptions = [
    'مشهور', 'وصل حديثًا',
    'السعر: الأقل إلى الأعلى', 'السعر: الأعلى إلى الأقل', 'تقييم المنتج'
  ];

  // ─── جيب النتايج لما يتغير الـ q ──────────────────────────
  useEffect(() => {
    if (!q.trim()) { setAllProducts([]); return; }

    setLoading(true);
    setSearched(false);
    setSelectedBrands([]);
    setSelectedDiscount(null);
    setSelectedCategory(null);
    setPriceRange({ min: 100, max: 16999 });

    fetch(`${process.env.REACT_APP_API_URL || ''}/api/products/search?q=${encodeURIComponent(q)}&limit=100`)
      .then(r => r.json())
      .then(data => {
        setAllProducts(data.products || []);
        setSearched(true);
      })
      .catch(() => setAllProducts([]))
      .finally(() => setLoading(false));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [q]);

  // ─── استخرج الـ brands و categories من النتايج ────────────
  const availableBrands = useMemo(() => (
    [...new Set(allProducts.map(p => p.brand).filter(Boolean))]
  ), [allProducts]);

  const availableCategories = useMemo(() => (
    [...new Set(allProducts.map(p => p.category).filter(Boolean))]
  ), [allProducts]);

  // ─── Filter + Sort ─────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];
    filtered = filtered.filter(p => p.price >= priceRange.min && p.price <= priceRange.max);
    if (selectedBrands.length > 0)  filtered = filtered.filter(p => selectedBrands.includes(p.brand));
    if (selectedDiscount === '20')  filtered = filtered.filter(p => parseInt(p.discount) >= 20);
    else if (selectedDiscount === '10') filtered = filtered.filter(p => parseInt(p.discount) >= 10);
    if (selectedCategory) filtered = filtered.filter(p => p.category === selectedCategory);

    switch (selectedSort) {
      case 'السعر: الأقل إلى الأعلى': filtered.sort((a, b) => a.price - b.price); break;
      case 'السعر: الأعلى إلى الأقل': filtered.sort((a, b) => b.price - a.price); break;
      case 'تقييم المنتج':             filtered.sort((a, b) => b.rating - a.rating); break;
      case 'وصل حديثًا':              filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      default:                         filtered.sort((a, b) => b.reviewsCount - a.reviewsCount);
    }
    return filtered;
  }, [allProducts, priceRange, selectedBrands, selectedDiscount, selectedCategory, selectedSort]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleBrandToggle    = (brand) => setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  const handleMinPriceChange = (value) => setPriceRange(prev => ({ ...prev, min: Math.min(Number(value), prev.max - 50) }));
  const handleMaxPriceChange = (value) => setPriceRange(prev => ({ ...prev, max: Math.max(Number(value), prev.min + 50) }));
  const handleCategoryClick  = (cat)   => setSelectedCategory(prev => prev === cat ? null : cat);

  const handleWishlist = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) { alert('سجل دخولك الأول عشان تضيف للمفضلة'); return; }
    try {
      const res  = await fetch((process.env.REACT_APP_API_URL || '') + '/api/wishlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId })
      });
      const data = await res.json();
      res.ok ? alert('تمت الإضافة للمفضلة ✅') : alert(data.message);
    } catch (err) { console.error(err); }
  };

  // ─── Empty state (no query) ────────────────────────────────
  if (!q.trim()) {
    return (
      <>
        <HeroSection showExtra={false} />
        <div className="products-page-wrapper">
          <div className="no-results">
            <i className="fa-solid fa-magnifying-glass" />
            <p>اكتب كلمة للبحث</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <HeroSection showExtra={false} />

      <div className="products-page-wrapper">
        <div className="products-page">

          {/* ─── Sidebar ─────────────────────────────────── */}
          <aside className="sidebar">

            {/* الفئة - بتيجي من النتايج نفسها */}
            {availableCategories.length > 0 && (
              <div className="sidebar-section">
                <h3 className="sidebar-title">الفئة</h3>
                <ul className="category-list">
                  {availableCategories.map(cat => (
                    <li
                      key={cat}
                      className={selectedCategory === cat ? 'active' : ''}
                      onClick={() => handleCategoryClick(cat)}
                      style={{ cursor: 'pointer' }}
                    >
                      {cat}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* السعر */}
            <div className="sidebar-section">
              <button className="apply-btn" onClick={() => {}}>تطبيق</button>
              <div className="price-range-container">
                <div className="price-inputs">
                  <input type="number" value={priceRange.max} onChange={(e) => handleMaxPriceChange(e.target.value)} className="price-input" />
                  <span className="separator">-</span>
                  <input type="number" value={priceRange.min} onChange={(e) => handleMinPriceChange(e.target.value)} className="price-input" />
                </div>
                <div className="price-slider">
                  <input type="range" min="100" max="16999" value={priceRange.min} onChange={(e) => handleMinPriceChange(e.target.value)} className="slider-input slider-min" />
                  <input type="range" min="100" max="16999" value={priceRange.max} onChange={(e) => handleMaxPriceChange(e.target.value)} className="slider-input slider-max" />
                  <div className="slider-track">
                    <div className="slider-range" style={{
                      left:  `${((priceRange.min - 100) / 16900) * 100}%`,
                      right: `${100 - ((priceRange.max - 100) / 16900) * 100}%`
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* نسبة الخصم */}
            <div className="sidebar-section">
              <h3 className="sidebar-title">نسبة الخصم</h3>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="discount" checked={selectedDiscount === '20'} onChange={() => setSelectedDiscount(selectedDiscount === '20' ? null : '20')} />
                  <span>20% أو أكثر</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="discount" checked={selectedDiscount === '10'} onChange={() => setSelectedDiscount(selectedDiscount === '10' ? null : '10')} />
                  <span>10% أو أكثر</span>
                </label>
              </div>
            </div>

            {/* الماركة - بتيجي من النتايج نفسها */}
            {availableBrands.length > 0 && (
              <div className="sidebar-section">
                <h3 className="sidebar-title">الماركة</h3>
                <div className="checkbox-group">
                  {availableBrands.map(brand => (
                    <label key={brand} className="checkbox-label">
                      <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => handleBrandToggle(brand)} />
                      <span>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

          </aside>

          {/* ─── Main Content ─────────────────────────────── */}
          <main className="main-content">

            {/* Header */}
            <div className="content-header">
              <div className="sort-section">
                <button className="sort-dropdown" onClick={() => setShowSortDropdown(!showSortDropdown)}>
                  <span>ترتيب حسب: {selectedSort}</span>
                  <i className={`fa-solid fa-chevron-${showSortDropdown ? 'down' : 'up'}`} />
                </button>
                {showSortDropdown && (
                  <div className="sort-dropdown-menu">
                    {sortOptions.map(option => (
                      <div
                        key={option}
                        className={`sort-option ${selectedSort === option ? 'active' : ''}`}
                        onClick={() => { setSelectedSort(option); setShowSortDropdown(false); }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="results-info">
                <span>نتايج البحث عن "<strong>{q}</strong>" ({filteredProducts.length} منتج)</span>
              </div>
            </div>

            {/* الفلاتر النشطة */}
            {(selectedBrands.length > 0 || selectedDiscount || selectedCategory) && (
              <div className="active-filters">
                <div className="active-filters-list">
                  {selectedBrands.length > 0 && (
                    <div className="active-filter-tag">
                      <span>الماركة: {selectedBrands.join(', ')}</span>
                      <button onClick={() => setSelectedBrands([])}>×</button>
                    </div>
                  )}
                  {selectedDiscount && (
                    <div className="active-filter-tag">
                      <span>خصم {selectedDiscount}% أو أكثر</span>
                      <button onClick={() => setSelectedDiscount(null)}>×</button>
                    </div>
                  )}
                  {selectedCategory && (
                    <div className="active-filter-tag">
                      <span>{selectedCategory}</span>
                      <button onClick={() => setSelectedCategory(null)}>×</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px', fontSize: '18px', color: '#757575' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px' }} />
                جاري البحث...
              </div>
            )}

            {/* Products Grid */}
            {!loading && (
              <div className="products-grid">
                {filteredProducts.map(product => (
                  <Link to={`/product/${product.productId}`} key={product._id} className="product-card-link">
                    <div className="product-card">
                      <div className="product-image-container">
                        <img src={product.media?.[0]?.url || '/assets/images/3.png'} alt={product.name} />
                        <button className="wishlist-btn" onClick={(e) => handleWishlist(e, product._id)}>
                          <i className="fa-regular fa-heart" />
                        </button>
                        {product.discount && parseInt(product.discount) > 0 && (
                          <span className="discount-badge">-{product.discount}</span>
                        )}
                        {product.freeShipping && (
                          <span className="free-shipping-badge">شحن مجاني</span>
                        )}
                      </div>
                      {product.freeShipping && (
                        <div className="free-shipping">
                          <i className="fa-solid fa-truck" />
                          <span>
                            {product.freeShippingMin > 0
                              ? `شحن مجاني من ${product.freeShippingMin} جنيه`
                              : 'شحن مجاني'}
                          </span>
                        </div>
                      )}
                      <div className="product-info">
                        <h3 className="product-name">{product.name}</h3>
                        <div className="product-pricing">
                          <span className="current-price">جنيه {product.price?.toFixed(2)}</span>
                          {product.oldPrice && (
                            <span className="original-price">جنيه {product.oldPrice?.toFixed(2)}</span>
                          )}
                        </div>
                        {product.rating > 0 && (
                          <div className="product-rating">
                            <div className="stars">
                              {[...Array(5)].map((_, i) => (
                                <i key={i} className={`fa-solid fa-star ${i < product.rating ? 'filled' : ''}`} />
                              ))}
                            </div>
                            <span className="reviews-count">({product.reviewsCount})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && searched && filteredProducts.length === 0 && (
              <div className="no-results">
                <i className="fa-solid fa-box-open" />
                <p>مفيش نتايج لـ "{q}"</p>
                <button className="reset-filters-btn" onClick={() => {
                  setPriceRange({ min: 100, max: 16999 });
                  setSelectedBrands([]);
                  setSelectedDiscount(null);
                  setSelectedCategory(null);
                }}>
                  إعادة تعيين الفلاتر
                </button>
              </div>
            )}

          </main>
        </div>
      </div>

      <Footer />
      <ScrollToTop />
    </>
  );
};

export default SearchPage;
