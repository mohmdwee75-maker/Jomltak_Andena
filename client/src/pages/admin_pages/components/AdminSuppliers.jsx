// src/pages/admin_pages/AdminSuppliers.jsx
import { useState, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL || '';
const token = () => localStorage.getItem('token');

const formatPhone = (raw) => {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('20')) return `+${digits}`;
  if (digits.startsWith('0'))  return `+20${digits.slice(1)}`;
  return `+20${digits}`;
};

// ── Modal إضافة / تعديل ─────────────────────────────────
function SupplierModal({ supplier, onClose, onSave }) {
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name:     supplier?.name     || '',
    phone:    supplier?.phone    || '',
    password: '',
    company:  supplier?.company  || '',
    notes:    supplier?.notes    || '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim())  return setError('الاسم مطلوب');
    if (!form.phone.trim()) return setError('رقم الهاتف مطلوب');
    if (!isEdit && !form.password) return setError('كلمة المرور مطلوبة');

    setLoading(true);
    setError('');
    try {
      const url    = isEdit
        ? `${API}/api/admin/suppliers/${supplier.supplierId}`
        : `${API}/api/admin/suppliers`;
      const method = isEdit ? 'PUT' : 'POST';
      const body   = isEdit
        ? { name: form.name, phone: formatPhone(form.phone), company: form.company, notes: form.notes }
        : { name: form.name, phone: formatPhone(form.phone), password: form.password, company: form.company, notes: form.notes };

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'حدث خطأ');
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="as-overlay" onClick={onClose}>
      <div className="as-modal" onClick={e => e.stopPropagation()}>
        <h3 className="as-modal-title">{isEdit ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</h3>

        <div className="as-form-grid">
          <div className="as-field">
            <label>الاسم *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="اسم المورد" />
          </div>
          <div className="as-field">
            <label>رقم الهاتف *</label>
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="01xxxxxxxxx"
              inputMode="numeric"
            />
          </div>
          {!isEdit && (
            <div className="as-field">
              <label>كلمة المرور *</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="6 خانات على الأقل" />
            </div>
          )}
          <div className="as-field">
            <label>اسم الشركة</label>
            <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="اختياري" />
          </div>
          <div className="as-field as-field--full">
            <label>ملاحظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات داخلية عن المورد" rows={3} />
          </div>
        </div>

        {error && <p className="as-error">⚠️ {error}</p>}

        <div className="as-modal-actions">
          <button className="as-btn-cancel" onClick={onClose}>إلغاء</button>
          <button className="as-btn-save" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المورد'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal تغيير كلمة المرور ─────────────────────────────
function PasswordModal({ supplier, onClose }) {
  const [pw,      setPw]      = useState('');
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState('');

  const handleSave = async () => {
    if (pw.length < 6) return setMsg('كلمة المرور يجب أن تكون 6 خانات على الأقل');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/admin/suppliers/${supplier.supplierId}/password`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ newPassword: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg('✅ تم تغيير كلمة المرور بنجاح');
      setTimeout(onClose, 1200);
    } catch (err) {
      setMsg(`⚠️ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="as-overlay" onClick={onClose}>
      <div className="as-modal as-modal--sm" onClick={e => e.stopPropagation()}>
        <h3 className="as-modal-title">تغيير كلمة مرور — {supplier.name}</h3>
        <div className="as-field">
          <label>كلمة المرور الجديدة</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="6 خانات على الأقل" />
        </div>
        {msg && <p className="as-error">{msg}</p>}
        <div className="as-modal-actions">
          <button className="as-btn-cancel" onClick={onClose}>إلغاء</button>
          <button className="as-btn-save" onClick={handleSave} disabled={loading}>
            {loading ? '⏳...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── الصفحة الرئيسية ─────────────────────────────────────
export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | 'add' | { supplier }
  const [pwModal,   setPwModal]   = useState(null); // null | supplier
  const [search,    setSearch]    = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/admin/suppliers`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleToggle = async (supplier) => {
    try {
      await fetch(`${API}/api/admin/suppliers/${supplier.supplierId}/toggle`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      fetchSuppliers();
    } catch { alert('حدث خطأ'); }
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`هل تريد حذف المورد "${supplier.name}"؟`)) return;
    try {
      await fetch(`${API}/api/admin/suppliers/${supplier.supplierId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      fetchSuppliers();
    } catch { alert('حدث خطأ'); }
  };

  const filtered = suppliers.filter(s =>
    s.name?.includes(search) || s.phone?.includes(search) || s.company?.includes(search)
  );

  return (
    <div className="as-page">

      {/* ── Header ── */}
      <div className="as-header">
        <div>
          <h2 className="as-title">إدارة الموردين</h2>
          <p className="as-sub">{suppliers.length} مورد مسجل</p>
        </div>
        <button className="as-btn-add" onClick={() => setModal('add')}>
          + إضافة مورد جديد
        </button>
      </div>

      {/* ── Search ── */}
      <div className="as-search-wrap">
        <input
          className="as-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث بالاسم أو التليفون أو الشركة..."
        />
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="as-loading">⏳ جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="as-empty">
          <span>🏭</span>
          <p>{search ? 'لا يوجد نتائج' : 'لا يوجد موردين بعد'}</p>
        </div>
      ) : (
        <div className="as-table-wrap">
          <table className="as-table">
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>التليفون</th>
                <th>الشركة</th>
                <th>الحالة</th>
                <th>التقييم</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.supplierId}>
                  <td className="as-td-id">{s.supplierId}</td>
                  <td className="as-td-name">
                    <div className="as-supplier-avatar">🏭</div>
                    <div>
                      <span className="as-name">{s.name}</span>
                      {s.notes && <span className="as-notes">{s.notes}</span>}
                    </div>
                  </td>
                  <td>{s.phone || '—'}</td>
                  <td>{s.company || '—'}</td>
                  <td>
                    <span className={`as-badge ${s.isActive ? 'as-badge--active' : 'as-badge--inactive'}`}>
                      {s.isActive ? '✅ مفعّل' : '🔴 معطّل'}
                    </span>
                  </td>
                  <td>
                    {'★'.repeat(Math.round(s.rating || 0))}{'☆'.repeat(5 - Math.round(s.rating || 0))}
                  </td>
                  <td>
                    <div className="as-actions">
                      <button className="as-action-btn as-action-edit"
                        title="تعديل" onClick={() => setModal(s)}>✏️</button>
                      <button className="as-action-btn as-action-pw"
                        title="تغيير كلمة المرور" onClick={() => setPwModal(s)}>🔑</button>
                      <button
                        className={`as-action-btn ${s.isActive ? 'as-action-ban' : 'as-action-unban'}`}
                        title={s.isActive ? 'تعطيل' : 'تفعيل'}
                        onClick={() => handleToggle(s)}
                      >
                        {s.isActive ? '🚫' : '✅'}
                      </button>
                      <button className="as-action-btn as-action-delete"
                        title="حذف" onClick={() => handleDelete(s)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {modal && (
        <SupplierModal
          supplier={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchSuppliers(); }}
        />
      )}
      {pwModal && (
        <PasswordModal
          supplier={pwModal}
          onClose={() => { setPwModal(null); fetchSuppliers(); }}
        />
      )}
    </div>
  );
}
