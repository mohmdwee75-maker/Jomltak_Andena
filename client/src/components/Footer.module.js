// src/components/Footer.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Footer.css';

const FooterSection = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`footer-section ${isOpen ? 'open' : ''}`}>
      <h3 onClick={() => setIsOpen(!isOpen)}>
        {title}
        <span className="footer-toggle-icon">{isOpen ? '−' : '+'}</span>
      </h3>
      <div className="footer-section-content">
        {children}
      </div>
    </div>
  );
};

const Footer = () => {
  const navigate = useNavigate();

  const handleNav = (path) => (e) => {
    e.preventDefault();
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        <FooterSection title="عن الشركة">
          <ul>
            <li><a href="/info" onClick={handleNav('/info?page=about')}>من نحن</a></li>
            <li><a href="/info" onClick={handleNav('/info?page=contact')}>تواصل معانا</a></li>
          </ul>
        </FooterSection>

        <FooterSection title="خدمة العملاء">
          <ul>
            <li><a href="/info" onClick={handleNav('/info?page=return')}>سياسة الإرجاع والاستبدال</a></li>
            <li><a href="/info" onClick={handleNav('/info?page=faq')}>الأسئلة الشائعة</a></li>
            <li><a href="/info" onClick={handleNav('/info?page=shipping')}>الشحن والتوصيل</a></li>
          </ul>
        </FooterSection>

        <FooterSection title="حسابي">
          <ul>
            <li><a href="/login">تسجيل الدخول</a></li>
            <li><a href="/orders">طلباتي</a></li>
          </ul>
        </FooterSection>

        <FooterSection title="قانوني">
          <ul>
            <li><a href="/info" onClick={handleNav('/info?page=terms')}>الشروط والأحكام</a></li>
            <li><a href="/info" onClick={handleNav('/info?page=privacy')}>سياسة الخصوصية</a></li>
          </ul>
        </FooterSection>

        <FooterSection title="تابعنا على">
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon">
              <i className="fab fa-facebook"></i> فيسبوك
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon">
              <i className="fab fa-instagram"></i> إنستجرام
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="social-icon">
              <i className="fab fa-tiktok"></i> تيك توك
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon">
              <i className="fab fa-youtube"></i> يوتيوب
            </a>
          </div>
        </FooterSection>
      </div>

      <div className="footer-bottom">
        <p>© 2026 جميع الحقوق محفوظة لشركة [جملتك عندنا]</p>
      </div>
    </footer>
  );
};

export default Footer;