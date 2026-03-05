import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeroSection from "./HeroSection.module";
import Footer from "./Footer.module";
import ScrollToTop from "./ScrollToTop.module";
import './Ordersuccess.css';

export default function OrderSuccess() {
  const navigate  = useNavigate();
  const [seconds, setSeconds] = useState(35);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <>
    <HeroSection showExtra={false} />
    <div className="success-page">
      <div className="success-card">

        {/* أيقونة النجاح */}
        <div className="success-icon-wrapper">
          <div className="success-icon-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        {/* النص */}
        <h1 className="success-title">تم استلام طلبك! 🎉</h1>
        <p className="success-subtitle">شكراً لثقتك بنا</p>

        <div className="success-message">
          <p>طلبك وصلنا بنجاح وهيتم مراجعته في أقرب وقت.</p>
          <p>سيتواصل معك أحد أفراد فريق الدعم خلال <strong>24 - 48 ساعة</strong> على رقم موبايلك لتأكيد الطلب وتحديد موعد التسليم.</p>
        </div>

        {/* بوكس معلومات */}
        <div className="success-info-box">
          <div className="success-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.37 2 2 0 0 1 3.58 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>هنتواصل معاك على رقمك المسجل</span>
          </div>
          <div className="success-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <span>الدفع عند الاستلام (كاش)</span>
          </div>
          <div className="success-info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>التوصيل خلال 3 - 7 أيام عمل</span>
          </div>
        </div>

        {/* العد التنازلي */}
        <div className="success-countdown">
          <div className="countdown-circle">
            <svg viewBox="0 0 36 36">
              <path className="countdown-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path className="countdown-fill"
                strokeDasharray={`${(seconds / 15) * 100}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <span className="countdown-number">{seconds}</span>
          </div>
          <p className="countdown-text">سيتم تحويلك للصفحة الرئيسية خلال {seconds} ثانية</p>
        </div>

        {/* زر الرجوع */}
        <button className="success-home-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          الرجوع للصفحة الرئيسية الآن
        </button>

      </div>
    </div>
    <ScrollToTop />
    <Footer />
  </>
  );
}