// src/pages/admin/AdminApp.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الملف الرئيسي — بينادي على الكومبوننتس ويتحكم في الـ view
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React, { useState } from 'react';

import AdminSidebar  from './components/AdminSidebar';
import Dashboard     from './components/Dashboard';
import AddProduct    from './components/AddProduct';
import EditProducts  from './components/EditProducts';
import EditProduct   from './components/EditProduct';
import PendingOrders from './components/PendingOrders';
import ActiveOrders  from './components/ActiveOrders';
import HeroSection   from '../../components/HeroSection.module';
import Footer        from '../../components/Footer.module';
import ScrollToTop   from '../../components/ScrollToTop.module';
// أضيف الـ import
import Customers from './components/Customer_admin';
// في الـ imports في الأعلى
import AdminChat from './components/AdminChat';
import FinancialDashboard from './components/FinancialDashboard';

// في الـ renderContent أضيف:
import './AddProduct.css';
import './EditProduct.css';
import './EditProducts.css';
import AdminSuppliers from './components/AdminSuppliers';
import './components/AdminSuppliers.css';



// view shape: { name: string, id?: string }
// name values: 'dashboard' | 'products' | 'add-product' | 'edit-product' | 'pending-orders' | 'active-orders'

export default function AdminApp() {
  const [view, setView] = useState({ name: 'dashboard' });

  // الـ active item في السايدبار
  const sidebarActive =
    view.name === 'edit-product'   ? 'products'    :
    view.name === 'add-product'    ? 'add-product' :
    view.name === 'pending-orders' ? 'orders'      :
    view.name === 'active-orders'  ? 'orders'      :
    view.name;

  const renderContent = () => {
    switch (view.name) {
case 'customers': return <Customers setView={setView} />;

      case 'dashboard':      return <Dashboard      setView={setView} />;
      case 'add-product':    return <AddProduct     setView={setView} />;
      case 'products':       return <EditProducts   setView={setView} />;
      case 'edit-product':   return <EditProduct    setView={setView} productId={view.id} />;
      case 'orders':
      case 'pending-orders': return <PendingOrders  setView={setView} />;
      case 'active-orders':  return <ActiveOrders   setView={setView} />;
case 'financial': return <FinancialDashboard />;

      case 'chat': return <AdminChat />;
      case 'suppliers': return <AdminSuppliers />;
      default:               return <Dashboard      setView={setView} />;
    }
  };

  return (
    <>
      <HeroSection showExtra={false}/>
      <div className="ap-root">
  <AdminSidebar view={sidebarActive} setView={setView} />
  <div style={{ flex: 1, minWidth: 0, padding: '28px 24px', overflowX: 'hidden' }}>
    {renderContent()}
  </div>
</div>
      <Footer />
      <ScrollToTop />
    </>
  );
}