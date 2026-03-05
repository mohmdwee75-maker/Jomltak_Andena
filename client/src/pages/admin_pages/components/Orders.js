// src/pages/admin/components/Orders.js
import React from 'react';

export default function Orders() {
  return (
    <main className="ap-main">
      <header className="ap-header">
        <div>
          <h1 className="ap-title">الطلبات</h1>
          <p className="ap-subtitle">قريباً...</p>
        </div>
      </header>
      <div className="ap-card" style={{ alignItems: 'center', padding: '60px 24px', gap: '20px' }}>
        <i className="fa-solid fa-list-check" style={{ fontSize: '3rem', color: '#176FCA', opacity: 0.4 }}></i>
        <p style={{ color: '#666' }}>صفحة الطلبات تحت الإنشاء</p>
      </div>
    </main>
  );
}
