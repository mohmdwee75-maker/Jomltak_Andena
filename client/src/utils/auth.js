// src/utils/auth.js

export const getUserData_auth = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const base64 = token.split('.')[1];
    // ✅ بدل atob() مباشرة — بنعمل decode صح للعربي والـ Unicode
    const jsonString = decodeURIComponent(
      atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
};

export const isLoggedIn_auth = () => {
  return !!localStorage.getItem('token');
};

export const logout_auth = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  window.location.href = '/login';
};