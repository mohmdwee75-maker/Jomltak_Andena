// src/pages/ProfileDetails.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Profiledetails.module.css';

/*
  Flage_maping:
    0 = إنشاء حساب جديد
    1 = عرض / تعديل بيانات المستخدم  ← التعديل يحصل هنا في نفس الصفحة
    2 = Admin يعدل بيانات مستخدم
*/

// ── validation بسيطة على الفرونت ────────────────────────
const validate = (data) => {
  if (!data.firstName.trim() || data.firstName.trim().length < 2)
    return 'الإسم الأول يجب أن يكون حرفين على الأقل';
  if (!data.lastName.trim() || data.lastName.trim().length < 2)
    return 'الكنية يجب أن تكون حرفين على الأقل';
  if (!data.city.trim())
    return 'المدينة مطلوبة';
  if (data.birthDate) {
    const d = new Date(data.birthDate);
    if (isNaN(d.getTime())) return 'تاريخ الميلاد غير صحيح';
    if (d > new Date()) return 'تاريخ الميلاد لا يمكن أن يكون في المستقبل';
  }
  return null;
};

const ProfileDetails = ({ Flage_maping: propFlag = 0 }) => {
  const [searchParams] = useSearchParams();
  const Flage_maping = Number(searchParams.get('Flage_maping') ?? propFlag);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', birthDate: '', city: '', phone: ''
  });
  const [originalData, setOriginalData] = useState(null); // نسخة أصلية للـ cancel
  const [isEditing, setIsEditing] = useState(false); // وضع التعديل
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // ── جيب البيانات من السيرفر ─────────────────────────────
  useEffect(() => {
    if (Flage_maping !== 1) return;
    const fetchProfile = async () => {
      setFetching(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/signin'); return; }

        const res = await fetch('https://jomltak-andena-server-production.up.railway.app/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) { navigate('/signin'); return; }
        const data = await res.json();
        if (res.ok) {
          const loaded = {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            birthDate: data.birthDate ? data.birthDate.slice(0, 10) : '',
            city: data.city || ''
          };
          setFormData(loaded);
          setOriginalData(loaded); // احفظ نسخة أصلية
        }
      } catch (err) {
        setError('فشل تحميل البيانات، حاول مرة أخرى');
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Flage_maping]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // ── حفظ التعديلات ────────────────────────────────────────
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // validation
    const validationError = validate(formData);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/signin'); return; }

      const response = await fetch('https://jomltak-andena-server-production.up.railway.app/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        // بنبعت بس الحقول المسموح تتغير
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          birthDate: formData.birthDate,
          city: formData.city.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setOriginalData({ ...formData }); // حدّث النسخة الأصلية
        setIsEditing(false);
        setSuccess('تم حفظ البيانات بنجاح ✓');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'حدث خطأ أثناء الحفظ');
      }
    } catch (err) {
      setError('فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // ── إلغاء التعديل ────────────────────────────────────────
  const handleCancelEdit = () => {
    setFormData(originalData); // ارجع للبيانات الأصلية
    setIsEditing(false);
    setError('');
  };

  // ── إنشاء حساب (Flage_maping === 0) ─────────────────────
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) { setError('يجب الموافقة على الشروط والأحكام'); return; }

    const validationError = validate(formData);
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('reg_token');
      const response = await fetch('https://jomltak-andena-server-production.up.railway.app/login_details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('reg_token', data.token);
        navigate('/create-password');
      } else {
        setError(data.message || 'حدث خطأ أثناء حفظ البيانات');
      }
    } catch {
      setError('فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // VIEW MODE (Flage_maping === 1)
  // ════════════════════════════════════════════════════════
  if (Flage_maping === 1) {
    return (
      <div className={styles.container}>
        <div className={styles.formBox}>
          <div className={styles.iconContainer}>
            <img src='/assets/images/new_logo.png' alt="Logo" className={styles.logo} />
          </div>

          <h1 className={styles.title}>بيانات حسابي</h1>
          <p className={styles.subtitle}>
            {isEditing ? 'عدّل بياناتك ثم اضغط حفظ' : 'تفاصيل ملفك الشخصي'}
          </p>

          {fetching ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '30px 0' }}>
              جاري تحميل البيانات...
            </p>
          ) : isEditing ? (
            /* ── وضع التعديل ── */
            <form onSubmit={handleSaveEdit} className={styles.form}>

              <div className={styles.inputGroup}>
                <input
                  type="text" name="firstName" value={formData.firstName}
                  onChange={handleChange} placeholder="الإسم الأول *" required
                  className={styles.input} maxLength={50}
                />
              </div>

              <div className={styles.inputGroup}>
                <input
                  type="text" name="lastName" value={formData.lastName}
                  onChange={handleChange} placeholder="الكنية *" required
                  className={styles.input} maxLength={50}
                />
              </div>

              <div className={styles.inputGroup}>
                <input
                  type="date" name="birthDate" value={formData.birthDate}
                  onChange={handleChange}
                  className={styles.input}
                  max={new Date().toISOString().split('T')[0]} // منع المستقبل
                />
                <label className={styles.inputLabel}>تاريخ الميلاد</label>
              </div>

              <div className={styles.inputGroup}>
                <input
                  type="text" name="city" value={formData.city}
                  onChange={handleChange} placeholder="المدينة *" required
                  className={styles.input} maxLength={100}
                />
              </div>

              {error && <p className={styles.errorText}>{error}</p>}
              {success && <p className={styles.successText}>{success}</p>}

              <div className={styles.editBtnRow}>
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  إلغاء
                </button>
              </div>

            </form>
          ) : (
            /* ── وضع العرض ── */
            <div className={styles.viewContainer}>
              <div className={styles.viewItem}>
                <label className={styles.viewLabel}>الإسم الأول</label>
                <p className={styles.viewValue}>{formData.firstName || '—'}</p>
              </div>
              <div className={styles.viewItem}>
                <label className={styles.viewLabel}>الكنية</label>
                <p className={styles.viewValue}>{formData.lastName || '—'}</p>
              </div>
              <div className={styles.viewItem}>
                <label className={styles.viewLabel}>تاريخ الميلاد</label>
                <p className={styles.viewValue}>{formData.birthDate || '—'}</p>
              </div>
              <div className={styles.viewItem}>
                <label className={styles.viewLabel}>المدينة</label>
                <p className={styles.viewValue}>{formData.city || '—'}</p>
              </div>

              {success && <p className={styles.successText}>{success}</p>}

              <div className={styles.editBtnRow}>
                <button
                  className={styles.editBtn}
                  onClick={() => { setIsEditing(true); setError(''); }}
                >
                  ✏️ تعديل البيانات
                </button>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                  رجوع
                </button>
              </div>
            </div>
          )}

          <p className={styles.helpText}>تحتاج إلى مساعدة؟ تواصل بنا على 19586</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // CREATE / ADMIN MODE
  // ════════════════════════════════════════════════════════
  const isAdminMode = Flage_maping === 2;
  const isCreateMode = Flage_maping === 0;

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <div className={styles.iconContainer}>
          <img src='/assets/images/new_logo.png' alt="Logo" className={styles.logo} />
        </div>

        <h1 className={styles.title}>
          {isAdminMode ? 'تعديل بيانات المستخدم - Admin' : 'تفاصيل شخصية'}
        </h1>
        <p className={styles.subtitle}>
          {isAdminMode ? 'يمكنك تعديل جميع بيانات المستخدم' : 'نحتاج منك لملء بعض التفاصيل.'}
        </p>

        <form onSubmit={handleSubmitCreate} className={styles.form}>
          <div className={styles.inputGroup}>
            <input type="text" name="firstName" value={formData.firstName}
              onChange={handleChange} placeholder="الإسم الأول *" required
              className={`${styles.input} ${isAdminMode ? styles.adminInput : ''}`}
              maxLength={50}
            />
            {isAdminMode && <span className={styles.adminBadge}>Admin</span>}
          </div>

          <div className={styles.inputGroup}>
            <input type="text" name="lastName" value={formData.lastName}
              onChange={handleChange} placeholder="الكنية *" required
              className={`${styles.input} ${isAdminMode ? styles.adminInput : ''}`}
              maxLength={50}
            />
            {isAdminMode && <span className={styles.adminBadge}>Admin</span>}
          </div>

          <div className={styles.inputGroup}>
            <input type="text" name="birthDate" value={formData.birthDate}
              onChange={handleChange} placeholder="yyyy/م/يوم/" required
              className={`${styles.input} ${isAdminMode ? styles.adminInput : ''}`}
              onFocus={(e) => e.target.type = 'date'}
              onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
            />
            <label className={styles.inputLabel}>تاريخ الميلاد *</label>
            {isAdminMode && <span className={styles.adminBadge}>Admin</span>}
          </div>

          <div className={styles.inputGroup}>
            <input type="text" name="city" value={formData.city}
              onChange={handleChange} placeholder="المدينة *" required
              className={`${styles.input} ${isAdminMode ? styles.adminInput : ''}`}
              maxLength={100}
            />
            {isAdminMode && <span className={styles.adminBadge}>Admin</span>}
          </div>

          {isCreateMode && (
            <div className={styles.inputGroup}>
              <div className={styles.phoneInput || styles.inputGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#f0f0f0', padding: '10px', borderRadius: '8px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>+20 🇪🇬</span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 11) setFormData(prev => ({ ...prev, phone: val }));
                  }}
                  placeholder="رقم الهاتف *  01012345678"
                  required
                  className={styles.input}
                  inputMode="numeric"
                  maxLength={11}
                />
              </div>
            </div>
          )}

          {error && <p className={styles.errorText}>{error}</p>}

          <button type="submit"
            className={`${styles.submitBtn} ${isAdminMode ? styles.adminBtn : ''}`}
            disabled={loading}
          >
            {loading ? 'جاري الحفظ...' : (isAdminMode ? 'تحديث البيانات' : 'استمر')}
          </button>

          {isCreateMode && (
            <div className={styles.termsCheck}>
              <input type="checkbox" id="terms" checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)} />
              <label htmlFor="terms">
                وافقت على <a href="/terms" className={styles.link}>الشروط والأحكام</a>
              </label>
            </div>
          )}

          {isAdminMode && (
            <div className={styles.adminNote}>
              <p>⚠️ أنت تقوم بتعديل بيانات المستخدم كمسؤول</p>
            </div>
          )}
        </form>

        <p className={styles.helpText}>تحتاج إلى مساعدة؟ تواصل بنا على 19586</p>
      </div>
    </div>
  );
};

export default ProfileDetails;