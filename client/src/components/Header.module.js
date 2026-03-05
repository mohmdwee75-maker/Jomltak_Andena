// src/components/Header.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Header.css";

const Header = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  const goHome = () => {
    navigate('/');
  };

  return (
    <div className={`promo-banner ${visible ? 'promo-banner--visible' : ''}`}>
      <div className="promo-banner__inner">

        {/* اليمين: نجمة + نص */}
        <div className="promo-banner__right">
          <span className="promo-banner__star">✦</span>
          <span className="promo-banner__tagline" onClick={goHome}>جملتك عندنا</span>
          <span className="promo-banner__divider">|</span>
          <span className="promo-banner__sub">
            اطلب قطع غيار بسعر الجملة — توصلك باب بيتك
          </span>
        </div>

        {/* الشمال: شارة */}
        <div className="promo-banner__badge">🏷️ أسعار الجملة</div>

      </div>
      <div className="promo-banner__shimmer" />
    </div>
  );
};

export default Header;