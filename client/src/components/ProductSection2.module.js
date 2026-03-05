import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ProductSection1.css';

const ProductSection = () => {
  // ============================================================
  // 👇 غيّر الرقم ده بس عشان تتحكم في عدد الكروت المرئية
  //    (الكروت بتفضل بحجمها الأصلي — بس بنحدد كام منها يظهر)
  const CARDS_PER_VIEW = 5;
  // ============================================================

  const viewportRef = useRef(null);
  const trackRef    = useRef(null);
  const dragStartX  = useRef(null);
  const isDragging  = useRef(false);

  const products = [
    { name: 'حذاء كاي سهل الارتداء للرجال من...', price: '605.00',   oldPrice: '690.00',   image: '/assets/images/logo.png', discount: 'خصم 12%', tag: 'عرض رمضان' },
    { name: 'حذاء بانكو كونفور للنساء من جيليز',   price: '595.00',   oldPrice: '650.00',   image: '/assets/images/logo.png', discount: 'خصم 8%',  tag: 'عرض رمضان' },
    { name: 'حذاء جالاكسي 7 حريمي من اديداس',      price: '2,501.00', oldPrice: '4,169.00', image: '/assets/images/logo.png', discount: 'خصم 40%', tag: 'عرض رمضان' },
    { name: 'حذاء رن 4.0s 60s للرجال من اديداس',   price: '2,740.00', oldPrice: '3,200.00', image: '/assets/images/logo.png', discount: 'خصم 14%', tag: 'عرض رمضان' },
    { name: 'حذاء رياضي مربع بتقنية كلاود فوم',    price: '2,165.00', oldPrice: '2,681.00', image: '/assets/images/logo.png', discount: 'خصم 19%', tag: 'عرض رمضان' },
    { name: 'حذاء جري جالاكسي 7 للرجال',           price: '2,579.00', oldPrice: '3,100.00', image: '/assets/images/logo.png', discount: 'خصم 17%', tag: 'عرض رمضان' },
    { name: 'حزام تكييف سيارات',                    price: '180.00',   oldPrice: '200.00',   image: '/assets/images/logo.png', discount: 'خصم 10%', tag: 'عرض خاص' },
    { name: 'فلاتر هواء سيارات',                    price: '150.00',   oldPrice: '170.00',   image: '/assets/images/logo.png', discount: 'خصم 12%', tag: 'عرض خاص' },
    { name: 'زيت محرك سيارات',                      price: '220.00',   oldPrice: '250.00',   image: '/assets/images/logo.png', discount: 'خصم 12%', tag: 'عرض خاص' },
    { name: 'بطارية سيارة',                         price: '450.00',   oldPrice: '500.00',   image: '/assets/images/logo.png', discount: 'خصم 10%', tag: 'عرض خاص' },
    { name: 'إطارات سيارات',                        price: '800.00',   oldPrice: '950.00',   image: '/assets/images/logo.png', discount: 'خصم 16%', tag: 'عرض خاص' },
    { name: 'مكيف سيارة',                           price: '1200.00',  oldPrice: '1400.00',  image: '/assets/images/logo.png', discount: 'خصم 14%', tag: 'عرض خاص' },
    { name: 'مكيف سيارة',                           price: '1200.00',  oldPrice: '1400.00',  image: '/assets/images/logo.png', discount: 'خصم 14%', tag: 'عرض خاص' },
    { name: 'مكيف سيارة',                           price: '1200.00',  oldPrice: '1400.00',  image: '/assets/images/logo.png', discount: 'خصم 14%', tag: 'عرض خاص' },
    { name: 'مكيف سيارة',                           price: '1200.00',  oldPrice: '1400.00',  image: '/assets/images/logo.png', discount: 'خصم 14%', tag: 'عرض خاص' },
    { name: 'مكيف سيارة',                           price: '1200.00',  oldPrice: '1400.00',  image: '/assets/images/logo.png', discount: 'خصم 14%', tag: 'عرض خاص' },
  ];

  // ─── حساب عرض الكارت الفعلي من الـ DOM ─────────────────────────
  const getCardWidth = useCallback(() => {
    if (!trackRef.current) return 250;
    const firstCard = trackRef.current.querySelector('.product-card-enhanced');
    if (!firstCard) return 250;
    const gap = parseFloat(window.getComputedStyle(trackRef.current).gap) || 20;
    return firstCard.offsetWidth + gap;
  }, []);

  // ─── حساب الـ translateX الصح لكل page ──────────────────────────
  // آخر page: نتحرك بالظبط عشان الكروت الأخيرة تملأ الشاشة بدون فراغ
  const getTranslateForPage = useCallback((pageIndex) => {
    const cardW = getCardWidth();
    const maxPage = Math.max(0, products.length - CARDS_PER_VIEW);

    if (pageIndex >= maxPage && viewportRef.current) {
      // إجمالي عرض الـ track - عرض الـ viewport = بالظبط بدون فراغ
      const totalTrackW = products.length * cardW - (parseFloat(window.getComputedStyle(trackRef.current)?.gap) || 20);
      const viewportW   = viewportRef.current.offsetWidth;
      return Math.max(0, totalTrackW - viewportW);
    }
    return pageIndex * cardW;
  }, [getCardWidth, products.length, CARDS_PER_VIEW]);

  const maxPage   = Math.max(0, products.length - CARDS_PER_VIEW);
  const totalDots = maxPage + 1;

  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating]  = useState(false);
  const [translateX, setTranslateX]    = useState(0);

  // إعادة حساب عند resize
  useEffect(() => {
    const onResize = () => setTranslateX(getTranslateForPage(currentPage));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [currentPage, getTranslateForPage]);

  // ─── Navigate ────────────────────────────────────────────────────
  const goToPage = useCallback((pageIndex) => {
    if (isAnimating) return;
    const clamped = Math.max(0, Math.min(pageIndex, maxPage));
    setIsAnimating(true);
    setCurrentPage(clamped);
    // نستنى الـ DOM يتحدث الأول عشان getCardWidth يرجع قيمة صح
    requestAnimationFrame(() => {
      setTranslateX(getTranslateForPage(clamped));
    });
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, maxPage, getTranslateForPage]);

  const handlePrev = () => { if (currentPage > 0)      goToPage(currentPage - 1); };
  const handleNext = () => { if (currentPage < maxPage) goToPage(currentPage + 1); };

  // ─── Swipe / Drag — RTL: سحب يمين = prev، سحب شمال = next ──────
  const handleTouchStart = (e) => { dragStartX.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e) => {
    if (dragStartX.current === null) return;
    const diff = dragStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? handlePrev() : handleNext();
    dragStartX.current = null;
  };
  const handleMouseDown  = (e) => { dragStartX.current = e.clientX; isDragging.current = true; };
  const handleMouseUp    = (e) => {
    if (!isDragging.current) return;
    const diff = dragStartX.current - e.clientX;
    if (Math.abs(diff) > 50) diff > 0 ? handlePrev() : handleNext();
    isDragging.current = false;
    dragStartX.current = null;
  };
  const handleMouseLeave = () => { isDragging.current = false; dragStartX.current = null; };

  return (
    <div className="carousel-wrapper-enhanced">
      <div className="carousel-header-enhanced">
        <Link to="/" className="carousel-header-title">
          عروض رمضان
          <i className="fa-solid fa-chevron-left"></i>
        </Link>
      </div>

      <div className="carousel-main-enhanced">
        <button
          className="carousel-nav-btn-enhanced left"
          onClick={handleNext}
          disabled={isAnimating || currentPage >= maxPage}
        >❮</button>

        <div
          ref={viewportRef}
          className="carousel-viewport"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'grab' }}
        >
          <div
            ref={trackRef}
            className="carousel-track-enhanced"
            style={{
              transform: `translateX(${translateX}px)`,
              transition: isAnimating ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              userSelect: 'none',
            }}
          >
            {products.map((product, index) => (
              <div className="product-card-enhanced" key={index}>
                <div className="product-image-wrapper-enhanced">
                  <img src={product.image} alt={product.name} draggable="false" />
                  <span className="product-tag-enhanced">{product.tag}</span>
                  <span className="product-discount-enhanced">{product.discount}</span>
                </div>
                <div className="product-details-enhanced">
                  <h3 className="product-name-enhanced">{product.name}</h3>
                  <div className="product-pricing-enhanced">
                    <span className="current-price-enhanced">جنيه {product.price}</span>
                    <span className="original-price-enhanced">جنيه {product.oldPrice}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className="carousel-nav-btn-enhanced right"
          onClick={handlePrev}
          disabled={isAnimating || currentPage === 0}
        >❯</button>
      </div>

      <div className="carousel-indicators">
        <div className="indicator-dots">
          {Array.from({ length: totalDots }).map((_, index) => (
            <span
              key={index}
              className={`dot ${currentPage === index ? 'active' : ''}`}
              onClick={() => goToPage(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductSection;