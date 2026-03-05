import React from 'react';

const navItems = [
  { key: 'dashboard',   icon: 'fa-gauge',        label: 'الرئيسية'     },
  { key: 'products',    icon: 'fa-box',           label: 'المنتجات'     },
  { key: 'add-product', icon: 'fa-plus',          label: 'إضافة منتج'  },
  { key: 'orders',      icon: 'fa-list-check',    label: 'الطلبات'      },
  { key: 'customers',   icon: 'fa-users',         label: 'العملاء'      },
  { key: 'suppliers',   icon: 'fa-truck-ramp-box',label: 'الموردين'     },  // ← جديد
  { key: 'chat',        icon: 'fa-comments',      label: 'المحادثات'    },
  { key: 'financial',   icon: 'fa-chart-line',    label: 'السجل المالي' },
];

export default function AdminSidebar({ view, setView }) {
  return (
    <aside className="ap-sidebar">
      <div className="ap-sidebar-logo">
        <i className="fa-solid fa-shield-halved"></i>
        <span>لوحة التحكم</span>
      </div>
      <nav className="ap-sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`ap-nav-item ${view === item.key ? 'ap-nav-active' : ''}`}
            onClick={() => setView({ name: item.key })}
            style={{ background:'none', border:'none', width:'100%', cursor:'pointer', textAlign:'right' }}
          >
            <i className={`fa-solid ${item.icon}`}></i> {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}