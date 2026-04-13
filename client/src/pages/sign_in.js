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

// user mode: accepts email (customers) OR phone (suppliers)
const validateUserIdentifier = (value) => {
  return validateEmail(value) || validatePhone(value);
};

const getUserIdentifierHint = (identifier, touched) => {
  if (!identifier || !touched) return null;
  if (validateEmail(identifier)) return { text: 'إيميل صحيح ✓', type: 'success' };
  if (validatePhone(identifier)) return { text: 'رقم صحيح ✓ (للموردين)', type: 'success' };
  if (identifier.includes('@'))
    return { text: 'أدخل إيميل صحيح — مثال: name@gmail.com', type: 'warning' };
  if (/^\d+$/.test(identifier))
    return { text: `رقم غير مكتمل — الرقم 11 خانة يبدأ بـ 0`, type: 'warning' };
  return { text: 'أدخل بريدك الإلكتروني أو رقم هاتفك (للموردين)', type: 'warning' };
};

// mode: 'user' | 'admin'
function SignIn() {
  const location = useLocation();

  const [mode, setMode] = useState('user');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

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
    : validateUserIdentifier(identifier);  // user: email (عملاء) أو phone (موردين)

  const isFormValid = identifierValid && password.length >= 6;

  // ─── Handle Input Change ───────────────────────────────────────────────
  const handleIdentifierChange = (e) => {
    const val = e.target.value;
    if (mode === 'admin') {
      setIdentifier(val);
    } else {
      // لو رقم → اسمح بأرقام بس
      if (/^\d*$/.test(val)) {
        if (val.length <= 11) setIdentifier(val);
      } else {
        // لو إيميل → اسمح بأي نص
        setIdentifier(val);
      }
    }
    if (val.length === 0) setTouched(false);
    setError('');
  };

  // ─── Hint ──────────────────────────────────────────────────────────────
  const getHint = () => {
    if (!identifier || !touched) return null;
    if (mode === 'admin') {
      if (identifierValid) return { text: 'إيميل صحيح ✓', type: 'success' };
      return { text: 'أدخل إيميل صحيح — مثال: name@email.com', type: 'warning' };
    }
    return getUserIdentifierHint(identifier, touched);
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
        url = '/api/admin/login';
        body = { email: identifier.trim(), password };
      } else {
        url = '/signin';
        // العملاء بيدخلوا إيميل، الموردين بيدخلوا رقم هاتف
        const isPhone = validatePhone(identifier);
        body = {
          identifier: isPhone ? formatEgyptianPhone(identifier) : identifier.trim(),
          password
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

        if (mode === 'admin') {
          const redirectTo = location.state?.from || '/';
          navigate(redirectTo);
        } else {
          // If response user role is supplier, they'll act as supplier normally
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
            className={`${styles.modeBtn} ${mode === 'admin' ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeToggle('admin')}
          >
            🔐 مسؤول
          </button>
        </div>

        <p className={styles.subtitle}>
          {mode === 'admin'
            ? 'أدخل البريد الإلكتروني وكلمة المرور'
            : 'أدخل بريدك الإلكتروني وكلمة المرور '
          }
        </p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              {mode === 'admin' ? 'البريد الإلكتروني*' : 'البريد الإلكتروني*'}
            </label>
            <div className={styles.phoneInput}>
              {mode !== 'admin' && (
                <span className={styles.countryCode}>📧</span>
              )}
              <input
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                onBlur={() => identifier.length > 0 && setTouched(true)}
                placeholder={mode === 'admin' ? 'admin@email.com' : 'example@gmail.com'}
                className={styles.input}
                autoComplete="username"
                inputMode="email"
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