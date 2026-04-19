import React, { useState, useRef, useCallback, useEffect } from 'react';
import './AccountOverview.css';
import { getUserData_auth } from '../../utils/auth';
import MyOrders from './MyOrders';
import ReviewsPending from './ReviewsPending';
import Inbox from './Inbox';
import Favorites from './Favorites';
import AccountSettings from './AccountSettings';

// ─────────────────────────────────────────
// AvatarUpload Component
// ─────────────────────────────────────────
const AvatarUpload = ({ currentAvatar = null, onSave }) => {
  const [step, setStep]               = useState('idle'); // idle | cropping | uploading
  const [finalAvatar, setFinalAvatar] = useState(currentAvatar);
  const [uploadError, setUploadError] = useState('');
  const [cropPos, setCropPos]         = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize]       = useState(200);
  const [imgMeta, setImgMeta]         = useState({ w: 0, h: 0, offsetX: 0, offsetY: 0, scale: 1 });

  const fileInputRef  = useRef(null);
  const cropCanvasRef = useRef(null);
  const outputCanvas  = useRef(document.createElement('canvas'));
  const imgRef        = useRef(new Image());
  const dragging      = useRef(false);
  const dragStart     = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const resizing      = useRef(false);
  const resizeStart   = useRef({ size: 200, mx: 0, my: 0 });

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // لما يتغير الـ currentAvatar من برا (بعد ما الـ parent يجيبه من السيرفر) — حدّث الصورة
  useEffect(() => {
    if (currentAvatar) setFinalAvatar(currentAvatar);
  }, [currentAvatar]);

  // ── رسم الـ crop overlay ──
  const drawOverlay = useCallback(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    const { offsetX, offsetY, w, h, scale } = imgMeta;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, offsetX, offsetY, w * scale, h * scale);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cropPos.x + cropSize / 2, cropPos.y + cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imgRef.current, offsetX, offsetY, w * scale, h * scale);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cropPos.x + cropSize / 2, cropPos.y + cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cropPos.x + cropSize, cropPos.y + cropSize, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }, [imgMeta, cropPos, cropSize]);

  useEffect(() => {
    if (step === 'cropping') drawOverlay();
  }, [step, drawOverlay]);

  // ── فتح الملف ──
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      imgRef.current.onload = () => {
        const img = imgRef.current;
        const maxW = 420, maxH = 360;
        const scale   = Math.min(maxW / img.width, maxH / img.height, 1);
        const sw      = img.width  * scale;
        const sh      = img.height * scale;
        const offsetX = (maxW - sw) / 2;
        const offsetY = (maxH - sh) / 2;
        setImgMeta({ w: img.width, h: img.height, offsetX, offsetY, scale });
        const initSize = Math.min(sw, sh, 200);
        setCropSize(initSize);
        setCropPos({ x: offsetX + (sw - initSize) / 2, y: offsetY + (sh - initSize) / 2 });
        setStep('cropping');
      };
      imgRef.current.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── pointer events ──
  const getPos = (e, canvas) => {
    const rect    = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const pos = getPos(e, cropCanvasRef.current);
    const hx  = cropPos.x + cropSize;
    const hy  = cropPos.y + cropSize;
    if (Math.hypot(pos.x - hx, pos.y - hy) < 14) {
      resizing.current    = true;
      resizeStart.current = { size: cropSize, mx: pos.x, my: pos.y };
    } else {
      const cx = cropPos.x + cropSize / 2;
      const cy = cropPos.y + cropSize / 2;
      if (Math.hypot(pos.x - cx, pos.y - cy) < cropSize / 2) {
        dragging.current  = true;
        dragStart.current = { x: pos.x, y: pos.y, px: cropPos.x, py: cropPos.y };
      }
    }
  };

  const onPointerMove = (e) => {
    if (!dragging.current && !resizing.current) return;
    e.preventDefault();
    const pos = getPos(e, cropCanvasRef.current);
    const { offsetX, offsetY, w, h, scale } = imgMeta;
    const imgR = offsetX + w * scale;
    const imgB = offsetY + h * scale;

    if (resizing.current) {
      const delta   = ((pos.x - resizeStart.current.mx) + (pos.y - resizeStart.current.my)) / 2;
      const newSize = clamp(resizeStart.current.size + delta, 60, Math.min(imgR - offsetX, imgB - offsetY));
      setCropSize(newSize);
      setCropPos(prev => ({
        x: clamp(prev.x, offsetX, imgR - newSize),
        y: clamp(prev.y, offsetY, imgB - newSize),
      }));
    } else {
      setCropPos({
        x: clamp(dragStart.current.px + (pos.x - dragStart.current.x), offsetX, imgR - cropSize),
        y: clamp(dragStart.current.py + (pos.y - dragStart.current.y), offsetY, imgB - cropSize),
      });
    }
  };

  const onPointerUp = () => { dragging.current = false; resizing.current = false; };

  // ── تأكيد الـ crop ورفع الصورة للسيرفر ──
  const applyCrop = () => {
    const canvas = outputCanvas.current;
    canvas.width = canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const { offsetX, offsetY, scale } = imgMeta;
    const sx    = (cropPos.x - offsetX) / scale;
    const sy    = (cropPos.y - offsetY) / scale;
    const sSize = cropSize / scale;

    ctx.beginPath();
    ctx.arc(150, 150, 150, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, 300, 300);

    canvas.toBlob(async (blob) => {
      const previewUrl = URL.createObjectURL(blob);
      setFinalAvatar(previewUrl);
      setStep('uploading');

      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('avatar', blob, 'avatar.jpg');

        const response = await fetch('https://jomltak-andena-server-production.up.railway.app' + '/api/user/avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'فشل الرفع');

        setFinalAvatar(data.avatarUrl);
        setStep('idle');
        if (onSave) onSave(data.avatarUrl);

      } catch (err) {
        setUploadError(err.message);
        setStep('idle');
      }
    }, 'image/jpeg', 0.92);
  };

  return (
    <>
      <div className="avatar-wrapper" onClick={() => step === 'idle' && fileInputRef.current.click()}>
        <div className="user-avatar">
          {finalAvatar
            ? <img src={finalAvatar} alt="avatar" className="avatar-img" />
            : <i className="user-icon">👤</i>
          }
          {step === 'uploading' && <div className="avatar-uploading-overlay">⏳</div>}
        </div>
        {step !== 'uploading' && <div className="avatar-edit-overlay">تعديل</div>}
      </div>

      {uploadError && <p className="avatar-error">{uploadError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {step === 'cropping' && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-box">
            <p className="crop-modal-title">اقتص الصورة</p>
            <canvas
              ref={cropCanvasRef}
              className="crop-canvas"
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
            />
            <p className="crop-hint">اسحب الدائرة لتحريكها • اسحب النقطة البيضا (↘) لتغيير الحجم</p>
            <div className="crop-btn-row">
              <button className="btn-secondary" onClick={() => setStep('idle')}>إلغاء</button>
              <button className="btn-primary"   onClick={applyCrop}>تأكيد الاقتصاص</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


// ─────────────────────────────────────────
// AccountOverview
// ─────────────────────────────────────────
const AccountOverview = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [userAvatar, setUserAvatar] = useState(null); // ✅ هنا صح — جوا الـ component

  const userData = getUserData_auth();

  // ✅ جيب الصورة من السيرفر عند أول تحميل للصفحة
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('https://jomltak-andena-server-production.up.railway.app' + '/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.image) setUserAvatar(data.image);
      } catch (err) {
        console.error('فشل جلب بيانات المستخدم:', err);
      }
    };
    fetchProfile();
  }, []); // [] = بيتنفذ مرة واحدة بس عند التحميل

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="content-grid">
            <div className="card">
              <h3 className="card-title">تفاصيل الحساب</h3>
              <div className="account-info">
                <p className="user-name-display">{userData?.firstName || 'المستخدم'}</p>
                <p className="user-email">{userData?.phoneNumber || '—'}</p>
              </div>
            </div>
            <div className="card">
              <h3 className="card-title">جهات الاتصال</h3>
              <div className="address-section">
                <p className="section-label">العنوان الافتراضي للشحن:</p>
                <p className="no-data">لا يوجد عنوان افتراضي للشحن</p>
                <button className="add-btn">إضافة عنوان افتراضي</button>
              </div>
            </div>
          </div>
        );
      case 'orders':    return <MyOrders />;
      case 'inbox':     return <Inbox />;
      case 'reviews':   return <ReviewsPending />;
      case 'favorites': return <Favorites />;
      case 'settings':  return <AccountSettings />;
      default: return null;
    }
  };

  const tabs = [
    { key: 'orders',    icon: '📦', label: 'طلباتي' },
    { key: 'inbox',     icon: '📬', label: 'صندوق الرسائل' },
    { key: 'reviews',   icon: '💬', label: 'التقييمات' },
    { key: 'favorites', icon: '❤️', label: 'المفضلة' },
  ];

  const titles = {
    overview:  'نظرة عامة',
    orders:    'طلباتي',
    inbox:     'الرسائل الواردة',
    reviews:   'التقييمات',
    favorites: 'المفضلة',
    settings:  'إعدادات الحساب',
  };

  return (
    <div className="account-overview-container">
      <div className="account-sidebar">
        <div className="user-profile">

          <AvatarUpload
            currentAvatar={userAvatar}
            onSave={(url) => setUserAvatar(url)}
          />

          <h3 className="user-name">حسابي على Jomltak 3ndna</h3>
        </div>

        <nav className="sidebar-menu">
          {tabs.map(tab => (
            <a
              key={tab.key}
              href="#"
              className={`menu-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={e => { e.preventDefault(); setActiveTab(tab.key); }}
            >
              <i className="icon">{tab.icon}</i>
              <span>{tab.label}</span>
            </a>
          ))}
        </nav>

        <div className="account-management">
          <a
            href="#"
            className={`sub-menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={e => { e.preventDefault(); setActiveTab('settings'); }}
          >
            ادارة الحساب
          </a>
        </div>

        <div className="logout-section">
          <button className="logout-btn">تسجيل الخروج</button>
        </div>
      </div>

      <div className="account-content">
        <h1 className="page-title">{titles[activeTab]}</h1>
        {renderContent()}
      </div>
    </div>
  );
};

export default AccountOverview;