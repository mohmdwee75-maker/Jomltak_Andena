// src/pages/admin/components/Dashboard.js
import React from 'react';

export default function Dashboard({ setView }) {
  return (
    <main className="ap-main">
      <header className="ap-header">
        <div>
          <h1 className="ap-title">الرئيسية</h1>
          <p className="ap-subtitle">مرحباً بك في لوحة التحكم</p>
        </div>
      </header>
      <div className="ap-card" style={{ alignItems: 'center', padding: '60px 24px', gap: '20px' }}>
        <i className="fa-solid fa-gauge" style={{ fontSize: '3rem', color: '#176FCA', opacity: 0.4 }}></i>
        <p style={{ color: '#666', fontSize: '15px' }}>اختر من السايدبار للبدء</p>
        <button
          className="ap-submit-btn"
          style={{ minWidth: 'auto' }}
          onClick={() => setView({ name: 'products' })}
        >
          <i className="fa-solid fa-box"></i> عرض المنتجات
        </button>
      </div>
    </main>
  );
}
