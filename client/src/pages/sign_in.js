// src/pages/SignIn.js
import React, { useState } from 'react';
import styles from './sign_in.module.css';
import { useNavigate, Link, useLocation } from 'react-router-dom';
// ─── Helpers ───────────────────────────────────────────────────────────────
const formatEgyptianPhone = (raw) => {
  const digits = raw.replace(/\D/g, '');
  const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits;
  return `+20${withoutLeadingZero}`;
};

const validatePhone = (value) => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('0');
};

const validateEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

// mode: 'user' | 'admin' | 'supplier'
function SignIn() {
const location = useLocation();

  const [mode, setMode]               = useState('user');
  const [identifier, setIdentifier]   = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [touched, setTouched]         = useState(false);

  const navigate = useNavigate();

  // ─── Toggle ────────────────────────────────────────────────────────────
  const handleModeToggle = (newMode) => {
    setMode(newMode);
    setIdentifier('');
    setError('');
    setTouched(false);
  };

  // ─── Validation ────────────────────────────────────────────────────────
  const identifierValid = mode === 'admin'
    ? validateEmail(identifier)    // admin بس بيستخدم إيميل
    : validatePhone(identifier);   // user و supplier بيستخدموا تليفون

  const isFormValid = identifierValid && password.length >= 6;

  // ─── Handle Input Change ───────────────────────────────────────────────
  const handleIdentifierChange = (e) => {
    const val = e.target.value;
    if (mode === 'admin') {
      setIdentifier(val);
    } else {
      const numeric = val.replace(/\D/g, '');
      if (numeric.length <= 11) setIdentifier(numeric);
    }
    if (val.length === 0) setTouched(false);
    setError('');
  };

  // ─── Hint ──────────────────────────────────────────────────────────────
  const getHint = () => {
    if (!identifier || !touched) return null;
    if (identifierValid) {
      return { text: mode === 'admin' ? 'إيميل صحيح ✓' : 'رقم صحيح ✓', type: 'success' };
    }
    if (mode === 'admin') {
      return { text: 'أدخل إيميل صحيح — مثال: name@email.com', type: 'warning' };
    }
    if (!identifier.startsWith('0')) {
      return { text: 'الرقم لازم يبدأ بـ 0 — مثال: 01012345678', type: 'warning' };
    }
    return { text: `باقي ${11 - identifier.length} أرقام`, type: 'warning' };
  };

  const hint = getHint();

  // ─── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError('');

    try {
      let url, body;

      if (mode === 'admin') {
        url  = 'http://localhost:5000/api/admin/login';
        body = { email: identifier.trim(), password };
      } else if (mode === 'supplier') {
        url  = 'http://localhost:5000/api/supplier/login';
        body = { phoneNumber: formatEgyptianPhone(identifier), password };
      } else {
        url  = 'http://localhost:5000/signin';
        body = { phoneNumber: formatEgyptianPhone(identifier), password };
      }

      const response = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {

        // ─── Ban Check (للمستخدم العادي بس) ───────────────────────────
        if (mode === 'user' && data.user?.isBanned) {
          const bannedUntil = new Date(data.user.bannedUntil);
          if (bannedUntil > new Date()) {
            const formattedDate = bannedUntil.toLocaleDateString('ar-EG', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'Africa/Cairo'
            });
            setError(`🚫 حسابك محظور حتى ${formattedDate}`);
            setLoading(false);
            return;
          }
        }

        // ─── حفظ البيانات ──────────────────────────────────────────────
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.user?.role || mode);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (mode === 'supplier') {
          const redirectTo = location.state?.from || '/';
          navigate(redirectTo);
        } else if (mode === 'admin') {
          const redirectTo = location.state?.from || '/';
          navigate(redirectTo);
        } else {
          const redirectTo = location.state?.from || '/';
          navigate(redirectTo);
        }

      } else {
        setError(data.message || 'بيانات غير صحيحة، حاول تاني');
      }
    } catch {
      setError('مش قادر يتصل بالسيرفر، تأكد من الاتصال بالإنترنت');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>

        <div className={styles.iconContainer}>
          <img src="/assets/images/new_logo.png" alt="Logo" className={styles.logo} />
        </div>

        <h1 className={styles.title}>تسجيل الدخول</h1>

        {/* ─── Toggle 3 تابات ─── */}
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'user' ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeToggle('user')}
          >
            👤 مستخدم
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'supplier' ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeToggle('supplier')}
          >
            🏭 مورد
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'admin' ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeToggle('admin')}
          >
            🔐 مسؤول
          </button>
        </div>

        <p className={styles.subtitle}>
          {mode === 'admin'
            ? 'أدخل البريد الإلكتروني وكلمة المرور'
            : 'أدخل رقم هاتفك وكلمة المرور للدخول إلى حسابك'}
        </p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              {mode === 'admin' ? 'البريد الإلكتروني*' : 'رقم الهاتف*'}
            </label>
            <div className={styles.phoneInput}>
              {mode !== 'admin' && (
                <span className={styles.countryCode}>+20 🇪🇬</span>
              )}
              <input
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                onBlur={() => identifier.length > 0 && setTouched(true)}
                placeholder={mode === 'admin' ? 'example@email.com' : '01012345678'}
                className={styles.input}
                autoComplete="username"
                inputMode={mode === 'admin' ? 'email' : 'numeric'}
                required
              />
            </div>
            {hint && (
              <span className={hint.type === 'success' ? styles.hintSuccess : styles.hintWarning}>
                {hint.text}
              </span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>كلمة المرور*</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="أدخل كلمة المرور"
                className={styles.inputField}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {mode !== 'admin' && (
              <div className={styles.forgotPassword}>
                <a href="/forgot-password">نسيت كلمة المرور؟</a>
              </div>
            )}
          </div>

          {error && (
            <p className={styles.errorText} role="alert">⚠️ {error}</p>
          )}

          <button
            type="submit"
            className={styles.continueBtn}
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <><span className={styles.spinner} aria-hidden="true" /> جاري تسجيل الدخول...</>
            ) : mode === 'user' ? 'تسجيل الدخول'
              : mode === 'supplier' ? 'دخول المورد'
              : 'دخول المسؤول'}
          </button>
        </form>

        <div className={styles.divider}><span>أو</span></div>

        <p className={styles.footer}>
          من خلال الدخول، توافق على <a href="/terms">الشروط والأحكام</a>
        </p>

        {mode === 'user' && (
          <p className={styles.registerLink}>
            مش عندك حساب؟ <Link to="/login">إنشاء حساب جديد</Link>
          </p>
        )}

        <p className={styles.helpText}>تحتاج إلى مساعدة؟ تواصل معنا</p>
      </div>
    </div>
  );
}

export default SignIn;