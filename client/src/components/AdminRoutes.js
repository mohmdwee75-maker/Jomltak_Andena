import { Navigate } from 'react-router-dom';
import { getUserData_auth, isLoggedIn_auth } from '../utils/auth';

export default function AdminRoute({ children }) {
  const loggedIn = isLoggedIn_auth();
  const userData = getUserData_auth();

  if (!loggedIn) return <Navigate to="/sign-in" replace />;
  if (userData?.role !== 'admin') return <Navigate to="/" replace />;
  
  return children;
}