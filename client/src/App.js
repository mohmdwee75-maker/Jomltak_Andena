import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP.module';
import CreatePassword from './pages/Createpassword';
import ProfileDetails from './pages/Profiledetails';
import MyAcc from './pages/my_acc';
import Inbox from './components/account/Inbox';
import Favorites from './components/account/Favorites';
import AccountSettings from './components/account/AccountSettings';
import Mainproduct from './pages/product_page/main_prod';
import MainCart from './pages/product_page/main_cart';
import SignIn from './pages/sign_in';
import AdminRoute from './components/AdminRoutes';
import SupplierRoute from './pages/supplier_pages/SupplierRoute';  // ← في مجلد supplier_pages
import SupplierDashboard from './pages/supplier_pages/SupplierDashboard';
import InfoPage from './pages/InfoPages';


import SearchPage from './pages/SearchPage';
import OrderPage from './components/OrderPage';
import OrderSuccess from './components/Ordersuccess';
import AdminApp from './pages/admin_pages/AdminApp';
import SupplierApp from './pages/supplier_pages/SupplierApp';  // ← جديد

function App() {
  return (
    <Routes>
<Route path="/supplier/dashboard" element={<SupplierDashboard />} />

      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path=(process.env.REACT_APP_API_URL || "") + "/verify-otp" element={<VerifyOTP />} />
      <Route path="/create-password" element={<CreatePassword />} />
      <Route path="/profile-details" element={<ProfileDetails />} />
      <Route path="/register" element={
        <AdminRoute>
          <Register />
        </AdminRoute>
      } />
      <Route path="/my-account" element={<MyAcc />} />
      <Route path="/my-account/Inbox" element={<Inbox />} />
      <Route path="/my-account/Favorites" element={<Favorites />} />
      <Route path="/my-account/AccountSettings" element={<AccountSettings />} />
      <Route path="/product/:id" element={<Mainproduct />} />
      <Route path="/cart" element={<MainCart />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route path="/info" element={<InfoPage />} />
      {/* ─── Admin ─── */}
      <Route path="/admin/*" element={
        <AdminRoute>
          <AdminApp />
        </AdminRoute>
      } />

      {/* ─── Supplier ─── */}
      <Route path="/supplier/*" element={
        <SupplierRoute>
          <SupplierApp />
        </SupplierRoute>
      } />
      
    </Routes>
    
  );
}

export default App;