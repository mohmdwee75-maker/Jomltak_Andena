// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Login.module.css';

function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (phoneNumber.length !== 11) {
      setError('يرجى إدخال رقم هاتف صحيح (11 أرقام)');
      return;
    }

    setError('');
    setLoading(true);

    const formattedPhone = `+20${phoneNumber.startsWith('0')
      ? phoneNumber.slice(1)
      : phoneNumber}`;

    console.log("الرقم النهائي:", formattedPhone);

    try {
      const response = await fetch('http://localhost:5000/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phoneNumber: formattedPhone }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/verify-otp', {
          state: {
            phoneNumber: formattedPhone,
            from: location.state?.from,  // ← نمرر الصفحة السابقة
          },
        });
      } else {
        setError(data.message || 'حدث خطأ، حاول مرة أخرى');
      }
    } catch (err) {
      setError('فشل الاتصال بالخادم');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>

        {/* اللوجو */}
        <div className={styles.iconContainer}>
          <img src='/assets/images/new_logo.png' alt="Logo" className={styles.logo} />
        </div>

        {/* العنوان */}
        <h1 className={styles.title}>مرحباً بكم في Jomltak 3ndna</h1>
        <p className={styles.subtitle}>
          إستخدم بريدك الإلكتروني أو رقم هاتفك لتسجيل الدخول أو إنشاء حساب
        </p>

        {/* الفورم */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              عنوان البريد الإلكتروني أو رقم الهاتف*
            </label>
            <div className={styles.phoneInput}>
              <span className={styles.countryCode}>+20 EG</span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 11) setPhoneNumber(value);
                }}
                placeholder="1281079916"
                className={styles.input}
                required
                minLength={11}
                maxLength={11}
              />
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
          </div>

          <button
            type="submit"
            className={styles.continueBtn}
            disabled={loading || phoneNumber.length !== 11}
          >
            {loading ? 'جاري التحميل...' : 'إستمرار'}
          </button>
        </form>

        {/* ── زرار "لدي حساب بالفعل" ── */}
        <div className={styles.hasAccountWrapper}>
          <p className={styles.hasAccountText}>لديك حساب بالفعل؟</p>
          <button
            type="button"
            className={styles.hasAccountBtn}
            onClick={() => navigate('/sign-in', { state: { from: location.state?.from } })}
          >
            تسجيل الدخول
          </button>
        </div>

        {/* الفوتر */}
        <p className={styles.footer}>
          من خلال الإستمرار، يتم بك على{' '}
          <a href="/terms">الشروط والأحكام</a>
        </p>

        <p className={styles.helpText}>
          تحتاج إلى مساعدة؟ تواصل معنا على
        </p>

      </div>
    </div>
  );
}

export default Login;