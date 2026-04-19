import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

// ── تهيئة Axios لكل الطلبات ──────────────────────────────
// هيضيف رابط السيرفر تلقائيًا لكل طلبات الـ API في الإنتاج
axios.defaults.baseURL = 'https://jomltak-andena-server-production.up.railway.app';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
