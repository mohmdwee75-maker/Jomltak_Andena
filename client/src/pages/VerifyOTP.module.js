// src/pages/VerifyOTP.module.js
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './VerifyOTP.module.css';

const VerifyOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || '';
  
  // Timer لإعادة الإرسال
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

const handleChange = (index, value) => {
  // نسمح برقم واحد بس
  if (value.length > 1) value = value[0];
  if (!/^\d*$/.test(value)) return;

  const newOtp = [...otp];
  newOtp[index] = value;

  // لو الخانة التالتة (index 2) وقيمتها صفر، امسحها
  if (index === 2 && value === '0') {
    newOtp[index] = '';
    setOtp(newOtp);
    return;
  }

  setOtp(newOtp);

  // الانتقال للخانة التالية تلقائياً
  if (value && index < 3) {
    inputRefs[index + 1].current.focus();
  }
};
  const handleKeyDown = (index, e) => {
    // لو ضغط Backspace ومفيش رقم، ارجع للخانة اللي قبلها
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('');
    setOtp([...newOtp, ...Array(4 - newOtp.length).fill('')]);
    
    // فوكس على آخر خانة
    const lastIndex = Math.min(newOtp.length - 1, 3);
    inputRefs[lastIndex].current.focus();
  };

  const handleSubmit = async (e) => {
    
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 4) {
      setError('يرجى إدخال الكود كاملاً');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // هنا هتبعت الكود للـ Backend
     const response = await fetch('https://jomltak-andena-server-production.up.railway.app/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: otpCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        // لو نجح التحقق، احفظ الـ token وروح للصفحة الرئيسية
        localStorage.setItem('reg_token', data.token);
        navigate('/profile-details');
      } else {
        setError(data.message || 'كود التحقق غير صحيح');
      }
    } catch (err) {
      setError('فشل الاتصال بالخادم');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    setResendTimer(60);
    // هنا هتبعت طلب لإعادة إرسال الكود
    try {
      await fetch('https://jomltak-andena-server-production.up.railway.app/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className={styles.otpContainer}>
      <div className={styles.otpBox}>
        {/* اللوجو */}
        <div className={styles.iconContainer}>
                  <img src='/assets/images/new_logo.png' alt="Logo" className={styles.logo} />
                </div>


        {/* العنوان */}
        <h1 className={styles.title}>تحقق من بريدك الإلكتروني</h1>
        <p className={styles.subtitle}>
          تم إرسال رمز التحقق إلى:
        </p>
        <p className={styles.phoneNumber}>📧 {email}</p>

        {/* حقول الـ OTP */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.otpInputs}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={styles.otpInput}
                dir='ltr'
              />
            ))}
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          {/* Checkbox أنا لست روبوت */}
          <div className={styles.robotCheck}>
            <input type="checkbox" id="notRobot" required />
            <label htmlFor="notRobot">أنا لست بروبوت</label>
          </div>

          {/* زرار الإرسال */}
          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={loading || otp.join('').length !== 4}
          >
            {loading ? 'جاري التحقق...' : 'تحقق من الكود'}
          </button>
        </form>

        {/* إعادة الإرسال */}
        <div className={styles.resendSection}>
          {resendTimer > 0 ? (
            <p className={styles.timerText}>
              يمكنك إعادة الإرسال بعد {resendTimer} ثانية
            </p>
          ) : (
            <button onClick={handleResend} className={styles.resendBtn}>
              إعادة إرسال الكود
            </button>
          )}
        </div>

        {/* الفوتر */}
        <p className={styles.helpText}>
          تحتاج إلى مساعدة؟ تواصل معنا على
        </p>
      </div>
    </div>
  );
  
};


export default VerifyOTP;