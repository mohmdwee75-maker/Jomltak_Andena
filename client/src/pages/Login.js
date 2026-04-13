// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Login.module.css';

const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function Login() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/verify-otp', {
          state: {
            email: email.trim(),
            from: location.state?.from,
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
          أدخل بريدك الإلكتروني لإنشاء حساب جديد
        </p>

        {/* الفورم */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              البريد الإلكتروني*
            </label>
            <div className={styles.phoneInput}>
              <span className={styles.countryCode}>📧</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="example@gmail.com"
                className={styles.input}
                required
                autoComplete="email"
                inputMode="email"
              />
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
          </div>

          <button
            type="submit"
            className={styles.continueBtn}
            disabled={loading || !validateEmail(email)}
          >
            {loading ? 'جاري الإرسال...' : 'إستمرار'}
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
          من خلال الإستمرار، توافق على{' '}
          <a href="/terms">الشروط والأحكام</a>
        </p>

        <p className={styles.helpText}>
          تحتاج إلى مساعدة؟ تواصل معنا
        </p>

      </div>
    </div>
  );
}

export default Login;