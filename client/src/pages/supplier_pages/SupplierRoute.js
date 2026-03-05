// src/components/SupplierRoute.js
import { Navigate } from 'react-router-dom';

function SupplierRoute({ children }) {
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role');

  if (!token || role !== 'supplier') {
    return <Navigate to="/sign-in" replace />;
  }

  return children;
}

export default SupplierRoute;
