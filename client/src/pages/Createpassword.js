// src/pages/CreatePassword.js
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Createpassword.module.css';

/*
  Flage_maping:
    0 = إنشاء كلمة مرور جديدة عند التسجيل
    1 = تغيير كلمة المرور لمستخدم مسجل
*/

// ── validation مشتركة ────────────────────────────────────
const validatePassword = (password, confirmPassword) => {
  if (password.length < 10)
    return 'كلمة المرور يجب أن تكون 10 خانات على الأقل';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return 'كلمة المرور يجب أن تحتوي على حروف وأرقام';
  if (password !== confirmPassword)
    return 'كلمة المرور غير متطابقة';
  return null;
};

const CreatePassword = ({ Flage_maping: propFlag = 0 }) => {
  const [searchParams] = useSearchParams();
  const Flage_maping   = Number(searchParams.get('Flage_maping') ?? propFlag);

  const [formData, setFormData] = useState({
    oldPassword:     '',
    password:        '',
    confirmPassword: '',
  });

  const [showOldPassword,     setShowOldPassword]     = useState(false);
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  // استخرج الإيميل من الـ reg_token
  const getEmailFromToken = () => {
    try {
      const token = localStorage.getItem('reg_token');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email || '';
    } catch { return ''; }
  };
  const userEmail = getEmailFromToken();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // ════════════════════════════════════════════════════════
  // Mode 0 — إنشاء كلمة مرور عند التسجيل (زي ما هو)
  // ════════════════════════════════════════════════════════
  const handleSubmitCreate = async (e) => {
    e.preventDefault();

    const validationError = validatePassword(formData.password, formData.confirmPassword);
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('reg_token');
      const response = await fetch('/save_account_details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: formData.password })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.removeItem('reg_token');
        localStorage.setItem('token', data.token);
        navigate('/');
      } else {
        setError(data.message || 'حدث خطأ أثناء العملية');
      }
    } catch {
      setError('فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // Mode 1 — تغيير كلمة المرور لمستخدم مسجل
  // ════════════════════════════════════════════════════════
  const handleSubmitChange = async (e) => {
    e.preventDefault();

    if (!formData.oldPassword.trim()) {
      setError('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    const validationError = validatePassword(formData.password, formData.confirmPassword);
    if (validationError) { setError(validationError); return; }

    // منع إن الباسورد الجديدة تكون نفس القديمة
    if (formData.oldPassword === formData.password) {
      setError('كلمة المرور الجديدة يجب أن تختلف عن الحالية');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/signin'); return; }

      const response = await fetch((process.env.REACT_APP_API_URL || '') + '/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: formData.oldPassword,
          newPassword: formData.password
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('تم تغيير كلمة المرور بنجاح ✓');
        setFormData({ oldPassword: '', password: '', confirmPassword: '' });
        setTimeout(() => navigate(-1), 2000);
      } else {
        setError(data.message || 'حدث خطأ أثناء التغيير');
      }
    } catch {
      setError('فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // MODE 1 — تغيير كلمة المرور (UI)
  // ════════════════════════════════════════════════════════
  if (Flage_maping === 1) {
    return (
      <div className={styles.container}>
        <div className={styles.formBox}>
          <div className={styles.iconContainer}>
            <img src='/assets/images/new_logo.png' alt="Logo" className={styles.logo} />
          </div>

          <h1 className={styles.title}>تغيير كلمة المرور</h1>
          <p className={styles.subtitle}>
            أدخل كلمة المرور الحالية ثم اختر كلمة مرور جديدة
          </p>

          <form onSubmit={handleSubmitChange} className={styles.form}>

            {/* كلمة المرور الحالية */}
            <div className={styles.inputGroup}>
              <input
                type={showOldPassword ? 'text' : 'password'}
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleChange}
                placeholder="كلمة المرور الحالية *"
                required
                className={`${styles.input} ${styles.changePasswordInput}`}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className={styles.eyeBtn}
              >
                {showOldPassword ? '👁️' : '🙈'}
              </button>
            </div>

            {/* كلمة المرور الجديدة */}
            <div className={styles.inputGroup}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="كلمة المرور الجديدة *"
                required
                className={`${styles.input} ${styles.changePasswordInput}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.eyeBtn}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>

            {/* تأكيد كلمة المرور الجديدة */}
            <div className={styles.inputGroup}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="تأكيد كلمة المرور الجديدة *"
                required
                className={`${styles.input} ${styles.changePasswordInput}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles.eyeBtn}
              >
                {showConfirmPassword ? '👁️' : '🙈'}
              </button>
            </div>

            {error   && <p className={styles.errorText}>{error}</p>}
            {success && <p className={styles.successText}>{success}</p>}

            <div className={styles.editBtnRow}>
              <button
                type="submit"
                className={`${styles.submitBtn} ${styles.changePasswordBtn}`}
                disabled={loading}
              >
                {loading ? 'جاري التحديث...' : 'حفظ كلمة المرور'}
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                إلغاء
              </button>
            </div>

          </form>

          <div className={styles.passwordNote}>
            <p>🔒 كلمة المرور يجب أن تحتوي على 10 أحرف على الأقل (حروف وأرقام)</p>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // MODE 0 — إنشاء كلمة مرور (UI) — زي ما هو بدون تغيير
  // ════════════════════════════════════════════════════════
  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <div className={styles.iconContainer}>
          <img src='/assets/images/new_logo.png' alt="Logo" className={styles.logo} />
        </div>

        <h1 className={styles.title}>أنشئ حسابك</h1>
        <p className={styles.subtitle}>
          استخدم مفاتيح المرور للوصول بشكل أسرع وأكثر أماناً دون الحاجة إلى كلمة مرور
        </p>

        <p className={styles.orText}>أو</p>

        <form onSubmit={handleSubmitCreate} className={styles.form}>
          <div className={styles.phoneDisplay}>
            <span className={styles.phoneNumber}>📧 {userEmail}</span>
            <button type="button" onClick={() => navigate('/login')} className={styles.editBtn}>
              تعديل
            </button>
          </div>

          <div className={styles.inputGroup}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="كلمة السر"
              required
              className={styles.input}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.eyeBtn}>
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>

          <div className={styles.inputGroup}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="تأكيد كلمة المرور"
              required
              className={styles.input}
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={styles.eyeBtn}>
              {showConfirmPassword ? '👁️' : '🙈'}
            </button>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'جاري الإنشاء...' : 'استمر'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePassword;