// src/components/HeroSection.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './HeroSection_main.css';
import { Link, useNavigate } from 'react-router-dom';
import { getUserData_auth, isLoggedIn_auth, logout_auth } from '../../src/utils/auth';

// ─── Data ────────────────────────────────────────────────
const MENU_ITEMS = [
  { id: 1, title: 'الفئة الأولى',  icon: '🏠', subItems: ['خيار 1', 'خيار 2', 'خيار 3'] },
  { id: 2, title: 'الفئة الثانية', icon: '📱', subItems: ['خيار A', 'خيار B', 'خيار C'] },
  { id: 3, title: 'الفئة الثالثة', icon: '🎮', subItems: ['خيار X', 'خيار Y', 'خيار Z'] },
];

const HELP_ITEMS = [
  { id: 1, title: 'مركز المساعدة',    icon: 'fa-circle-info'  },
  { id: 2, title: 'المساعدة في طلبي', icon: 'fa-box'          },
  { id: 3, title: 'إلغاء طلبك',       icon: 'fa-xmark'        },
  { id: 4, title: 'الإرجاع والاسترداد', icon: 'fa-rotate-left' },
  { id: 5, title: 'طرق الدفع',        icon: 'fa-credit-card'  },
];

const ChevronIcon = ({ open }) => (
  <i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
);

// ─── DropdownItem ─────────────────────────────────────────
const DropdownItem = ({ item }) => {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const show = () => { clearTimeout(timer.current); setOpen(true); };
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 300); };

  return (
    <div className="dropdown-item-container" onMouseEnter={show} onMouseLeave={hide}>
      <div className="dropdown-item">
        <span>{item.icon}</span>
        <span>{item.title}</span>
        <i className="fa-solid fa-chevron-left" />
      </div>
      {open && (
        <div className="sub-menu" onMouseEnter={show} onMouseLeave={hide}>
          {item.subItems.map((sub, i) => (
            <a key={i} href="#" className="sub-menu-item"
              onClick={(e) => { e.preventDefault(); setOpen(false); }}>
              {sub}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── UserMenu ─────────────────────────────────────────────
const UserMenu = ({ open, onToggle }) => {
  const navigate    = useNavigate();
  const isLoggedIn  = isLoggedIn_auth();
  const userData    = getUserData_auth();

  const isAdmin    = userData?.role === 'admin';
  const isSupplier = userData?.role === 'supplier';  // ✅ جديد

  const displayName = userData?.firstName || userData?.name || 'User';

  const handleLogout = () => {
    logout_auth();
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="user-menu-wrapper">
      {isLoggedIn ? (
        <>
          {/* ── زر الاسم ── */}
          <a
            href="#"
            className={`btn-user ${isAdmin ? 'btn-user--admin' : ''} ${isSupplier ? 'btn-user--supplier' : ''}`}
            onClick={onToggle}
          >
            <i className={`fa-solid ${isAdmin ? 'fa-shield-halved' : isSupplier ? 'fa-truck-ramp-box' : 'fa-user'}`} />
            <span>
              {isAdmin    ? `مرحباً، ${displayName} 👑`
              : isSupplier ? `مرحباً، ${displayName} 🏭`
              : `مرحباً، ${displayName}`}
            </span>
            <ChevronIcon open={open} />
          </a>

          {open && (
            <div className="user-dropdown">

              {/* ══ Supplier Dropdown ══ */}
              {isSupplier && (
                <>
                  <div className="user-dropdown-header user-dropdown-header--supplier">
                    <i className="fa-solid fa-truck-ramp-box" />
                    <span>لوحة المورد</span>
                  </div>
                  <Link to="/supplier/dashboard" className="user-dropdown-item">
                    <i className="fa-solid fa-gauge" />
                    <span>لوحة التحكم</span>
                  </Link>
                  <Link to="/supplier/dashboard" className="user-dropdown-item">
                    <i className="fa-solid fa-box" />
                    <span>الطلبات الواردة</span>
                  </Link>
                  <Link to="/supplier/dashboard" className="user-dropdown-item">
                    <i className="fa-solid fa-chart-line" />
                    <span>السجل المالي</span>
                  </Link>
                  <div className="user-dropdown-divider" />
                  <button onClick={handleLogout} className="user-dropdown-item user-dropdown-logout">
                    <i className="fa-solid fa-right-from-bracket" />
                    <span>تسجيل الخروج</span>
                  </button>
                </>
              )}

              {/* ══ Admin Dropdown ══ */}
              {isAdmin && (
                <>
                  <div className="user-dropdown-header user-dropdown-header--admin">
                    <i className="fa-solid fa-shield-halved" />
                    <span>لوحة المسؤول</span>
                  </div>
                  <Link to="/admin/dashboard" className="user-dropdown-item">
                    <i className="fa-solid fa-gauge" />
                    <span>لوحة التحكم</span>
                  </Link>
                  <div className="user-dropdown-divider" />
                  <div className="user-dropdown-section-label">إدارة المنتجات</div>
                  <Link to="/admin/products/add" className="user-dropdown-item user-dropdown-item--admin"><i className="fa-solid fa-plus" /><span>إضافة منتج</span></Link>
                  <Link to="/admin/products"     className="user-dropdown-item user-dropdown-item--admin"><i className="fa-solid fa-pen-to-square" /><span>تعديل المنتجات</span></Link>
                  <Link to="/admin/products"     className="user-dropdown-item user-dropdown-item--admin user-dropdown-item--danger"><i className="fa-solid fa-trash" /><span>حذف منتج</span></Link>
                  <div className="user-dropdown-divider" />
                  <div className="user-dropdown-section-label">إدارة الطلبات</div>
                  <Link to="/admin/orders" className="user-dropdown-item user-dropdown-item--admin"><i className="fa-solid fa-list-check" /><span>كل الطلبات</span></Link>
                  <div className="user-dropdown-divider" />
                  <button onClick={handleLogout} className="user-dropdown-item user-dropdown-logout">
                    <i className="fa-solid fa-right-from-bracket" />
                    <span>تسجيل الخروج</span>
                  </button>
                </>
              )}

              {/* ══ Customer Dropdown ══ */}
              {!isAdmin && !isSupplier && (
                <>
                  <Link to="/my-account" className="user-dropdown-login">حسابي</Link>
                  <Link to="/my-account" className="user-dropdown-item">
                    <i className="fa-solid fa-user" />
                    <span>الملف الشخصي</span>
                  </Link>
                  <Link to="/my-account" className="user-dropdown-item"><i className="fa-solid fa-basket-shopping" /><span>الطلبات</span></Link>
                  <Link to="/my-account" className="user-dropdown-item"><i className="fa-regular fa-heart" /><span>المفضلة</span></Link>
                  <div className="user-dropdown-divider" />
                  <button onClick={handleLogout} className="user-dropdown-item user-dropdown-logout">
                    <i className="fa-solid fa-right-from-bracket" />
                    <span>تسجيل الخروج</span>
                  </button>
                </>
              )}

            </div>
          )}
        </>
      ) : (
        <>
          <a href="#" className="btn-user" onClick={onToggle}>
            <i className="fa-solid fa-user" />
            <span>تسجيل الدخول</span>
            <ChevronIcon open={open} />
          </a>
          {open && (
            <div className="user-dropdown">
              <Link to="/sign-in" className="user-dropdown-login">تسجيل الدخول</Link>
              <Link to="/login"   className="user-dropdown-item"><i className="fa-regular fa-user" /><span>إنشاء حساب</span></Link>
              <Link to="/login"   className="user-dropdown-item"><i className="fa-solid fa-basket-shopping" /><span>الطلبات</span></Link>
              <Link to="/login"   className="user-dropdown-item"><i className="fa-regular fa-heart" /><span>المفضلة</span></Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── HelpMenu ─────────────────────────────────────────────
const HelpMenu = ({ open, onToggle }) => (
  <div className="btn2-wrapper">
    <a href="#" className="btn2" onClick={onToggle}>
      <i className="fa-solid fa-question-circle" />
      <span>المساعدة</span>
    </a>
    {open && (
      <div className="help-dropdown-menu">
        {HELP_ITEMS.map((item) => (
          <a key={item.id} href="#" className="help-menu-item" onClick={(e) => e.preventDefault()}>
            <i className={`fa-solid ${item.icon}`} />
            <span>{item.title}</span>
          </a>
        ))}
        <div className="help-contact-section">
          <a href="#" className="help-contact-btn chat-btn"><i className="fa-regular fa-comments" /> تحدث معنا</a>
          <a href="#" className="help-contact-btn whatsapp-btn"><i className="fa-brands fa-whatsapp" /> WhatsApp</a>
        </div>
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────
const HeroSection = ({ showExtra = true }) => {
  const navigate = useNavigate();

  const [openMenu, setOpenMenu]       = useState(null);
  const [search, setSearch]           = useState('');
  const [ghost, setGhost]             = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [visible, setVisible]         = useState(true);

  const lastScrollY = useRef(0);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      const inside =
        e.target.closest('.btn1-wrapper') ||
        e.target.closest('.btn2-wrapper') ||
        e.target.closest('.user-menu-wrapper') ||
        e.target.closest('.search-bar');
      if (!inside) {
        setOpenMenu(null);
        setShowDrop(false);
        setGhost('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setScrolled(current > 10);
      setVisible(current < lastScrollY.current || current < 50);
      lastScrollY.current = current;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggle = (name) => (e) => {
    e.preventDefault();
    setOpenMenu((prev) => (prev === name ? null : name));
  };

  const fetchSuggestions = useCallback(async (value) => {
    if (!value.trim()) {
      setSuggestions([]);
      setGhost('');
      setShowDrop(false);
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`/api/products/search?q=${encodeURIComponent(value)}&limit=6`);
      const data = await res.json();
      const products = data.products || [];
      setSuggestions(products);
      setShowDrop(products.length > 0);
      const first = products[0]?.name || '';
      if (first.toLowerCase().startsWith(value.toLowerCase()) && first.length > value.length) {
        setGhost(first);
      } else {
        setGhost('');
      }
    } catch {
      setSuggestions([]);
      setGhost('');
      setShowDrop(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSearchSubmit = () => {
    if (search.trim()) {
      setShowDrop(false);
      setGhost('');
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleSuggestionClick = (product) => {
    setSearch(product.name);
    setShowDrop(false);
    setGhost('');
    navigate(`/product/${product.productId}`);
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Tab' || e.key === 'ArrowLeft') && ghost) {
      e.preventDefault();
      setSearch(ghost);
      setGhost('');
      setShowDrop(false);
      return;
    }
    if (e.key === 'Enter')  handleSearchSubmit();
    if (e.key === 'Escape') { setShowDrop(false); setGhost(''); }
  };

  const ghostSuffix = ghost && ghost.toLowerCase().startsWith(search.toLowerCase())
    ? ghost.slice(search.length)
    : '';

  return (
    <>
      <div className={`top-sec ${scrolled ? 'scrolled' : ''} ${visible ? '' : 'hidden'}`}>

        <Link to="/" className="top-sec__logo-link">
          <span className="top-sec__logo-text">
            <span className="logo-part1">جملتك </span>
            <span className="logo-part2">عندنا</span>
          </span>
        </Link>

        <UserMenu open={openMenu === 'user'} onToggle={toggle('user')} />

        <div className="search-bar">
          <div className="searchbox" onClick={handleSearchSubmit} style={{ cursor: 'pointer' }}>
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`} />
          </div>
          <div className="search-ghost-wrapper">
            {ghostSuffix && (
              <div className="search-ghost-layer" aria-hidden="true">
                <span className="search-ghost-typed">{search}</span>
                <span className="search-ghost-suffix">{ghostSuffix}</span>
              </div>
            )}
            <input
              type="text"
              placeholder="ابحث عن منتج، براند، كاتيجوري..."
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
              onBlur={() => setTimeout(() => { setShowDrop(false); setGhost(''); }, 200)}
              className="search-input-main"
              autoComplete="off"
              dir="rtl"
            />
          </div>
          {showDrop && suggestions.length > 0 && (
            <div className="search-suggestions-dropdown">
              {suggestions.map((product) => (
                <div
                  key={product._id}
                  className="search-suggestion-item"
                  onMouseDown={() => handleSuggestionClick(product)}
                >
                  <div className="suggestion-img-wrap">
                    {product.media?.[0]?.url
                      ? <img src={product.media[0].url} alt={product.name} />
                      : <i className="fa-solid fa-box suggestion-no-img" />
                    }
                  </div>
                  <div className="suggestion-info">
                    <span className="suggestion-name">{product.name}</span>
                    {(product.category || product.brand) && (
                      <span className="suggestion-meta">
                        {product.category}{product.category && product.brand ? ' • ' : ''}{product.brand}
                      </span>
                    )}
                  </div>
                  <div className="suggestion-price">
                    <span className="suggestion-price-new">{product.price} ج</span>
                    {product.oldPrice && (
                      <span className="suggestion-price-old">{product.oldPrice} ج</span>
                    )}
                  </div>
                </div>
              ))}
              <div className="search-suggestions-all" onMouseDown={handleSearchSubmit}>
                <i className="fa-solid fa-magnifying-glass" />
                <span>عرض كل نتايج "{search}"</span>
              </div>
            </div>
          )}
        </div>

        <div className="right-buttons">
          <Link to="/cart" className="btn3">
            <i className="fa-solid fa-basket-shopping" />
            <span>سلة التسوق</span>
          </Link>
          <HelpMenu open={openMenu === 'help'} onToggle={toggle('help')} />
          <div className="btn1-wrapper">
            <a href="#" className="btn1" onClick={toggle('dropdown')}>
              <i className="fa-solid fa-bars" />
            </a>
            {openMenu === 'dropdown' && (
              <div className="dropdown-menu">
                {MENU_ITEMS.map((item) => (
                  <DropdownItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showExtra && (
        <div className="hero-image-container">
          <img src="/assets/images/main_image2.png" alt="main_image" className="main_image" />
        </div>
      )}
    </>
  );
};

export default HeroSection;