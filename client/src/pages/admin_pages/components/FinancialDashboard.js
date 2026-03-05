import React, { useEffect, useState, useCallback } from 'react';

const API = 'http://localhost:5000';
const fmt = (n) => Number(n || 0).toLocaleString('ar-EG') + ' جنيه';
const fmtDate = (d) => new Date(d).toLocaleDateString('ar-EG',
  { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function FinancialDashboard() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('summary');
  const [form, setForm]             = useState({ amount: '', description: '', purpose: '' });
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');
  const [allRecords, setAllRecords] = useState([]);

  const token = localStorage.getItem('token');

  // ✅ fetchData مصلوح - .then واحد بس
  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/financial/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setData(d);

        // ── اجمع كل التحركات وترتيبها بالتاريخ ──
        const orders = (d.deliveredOrders || []).map(o => ({
          _id:         o._id,
          type:        'income',
          description: `أوردر مكتمل - ${o.customer_id?.F_name || ''} ${o.customer_id?.L_name || ''}`,
          purpose:     null,
          orderId:     o.orderId,
          amount:      o.totalPrice,
          doneBy:      { name: 'نظام' },
          createdAt:   o.createdAt,
        }));

        const combined = [
          ...orders,
          ...(d.withdrawals || []),
          ...(d.deposits    || []),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setAllRecords(combined);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── تسجيل سحب ──
  const submitWithdraw = async () => {
    if (!form.amount || !form.description) { setMsg('❌ المبلغ والوصف مطلوبان'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/financial/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (res.ok) {
        setMsg('✅ تم تسجيل السحب بنجاح');
        setForm({ amount: '', description: '', purpose: '' });
        fetchData();
      } else {
        setMsg('❌ ' + json.message);
      }
    } catch {
      setMsg('❌ تعذر الاتصال بالسيرفر');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  // ── تسجيل إيداع ──
  const submitDeposit = async () => {
    if (!form.amount || !form.description) { setMsg('❌ المبلغ والوصف مطلوبان'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/financial/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (res.ok) {
        setMsg('✅ تم تسجيل الإيداع بنجاح');
        setForm({ amount: '', description: '', purpose: '' });
        fetchData();
      } else {
        setMsg('❌ ' + json.message);
      }
    } catch {
      setMsg('❌ تعذر الاتصال بالسيرفر');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  if (loading) return (
    <div style={styles.center}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#176FCA' }} />
    </div>
  );

  if (!data) return (
    <div style={styles.center}>
      <p style={{ color: '#94a3b8', fontFamily: 'Cairo' }}>تعذر تحميل البيانات، تأكد من تشغيل السيرفر</p>
    </div>
  );

  return (
    <div style={styles.root}>

      {/* ══ Header ══ */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <i className="fa-solid fa-chart-line" style={{ marginLeft: 10, color: '#176FCA' }} />
            السجل المالي
          </h2>
          <p style={styles.subtitle}>متابعة كاملة للإيرادات والمصروفات</p>
        </div>
        <button onClick={fetchData} style={styles.refreshBtn}>
          <i className="fa-solid fa-rotate-right" style={{ marginLeft: 6 }} /> تحديث
        </button>
      </div>

      {/* ══ بطاقات الملخص ══ */}
      <div style={styles.cards}>
        <StatCard icon="fa-arrow-trend-up"   label="إجمالي الإيرادات"  value={fmt(data.totalIncome)}      color="#22c55e" bg="#f0fdf4" />
        <StatCard icon="fa-piggy-bank"        label="إجمالي الإيداعات"  value={fmt(data.totalDeposits)}    color="#8b5cf6" bg="#f5f3ff" />
        <StatCard icon="fa-arrow-trend-down"  label="إجمالي السحوبات"   value={fmt(data.totalWithdrawals)} color="#ef4444" bg="#fef2f2" />
        <StatCard icon="fa-wallet"            label="الرصيد الصافي"     value={fmt(data.netBalance)}
          color={data.netBalance >= 0 ? '#176FCA' : '#ef4444'} bg="#eff6ff" />
        <StatCard icon="fa-box"               label="إجمالي الطلبات"    value={data.totalOrders}           color="#f59e0b" bg="#fffbeb" />
        <StatCard icon="fa-check-circle"      label="طلبات مكتملة"      value={data.deliveredCount}        color="#22c55e" bg="#f0fdf4" />
        <StatCard icon="fa-clock"             label="طلبات معلقة"       value={data.pendingOrders}         color="#64748b" bg="#f8fafc" />
      </div>

      {/* ══ Tabs ══ */}
      <div style={styles.tabs}>
        {[
          { key: 'summary',     label: 'تسجيل سحب',          icon: 'fa-minus-circle'       },
          { key: 'deposit',     label: 'تسجيل إيداع',         icon: 'fa-plus-circle'        },
          { key: 'orders',      label: 'الأوردرات المكتملة',  icon: 'fa-list'               },
          { key: 'withdrawals', label: 'سجل السحوبات',        icon: 'fa-file-invoice'       },
          { key: 'deposits',    label: 'سجل الإيداعات',       icon: 'fa-piggy-bank'         },
          { key: 'all',         label: 'السجل الشامل',        icon: 'fa-clock-rotate-left'  },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}>
            <i className={`fa-solid ${t.icon}`} style={{ marginLeft: 6 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ تسجيل سحب ══ */}
      {tab === 'summary' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fa-solid fa-hand-holding-dollar" style={{ marginLeft: 8, color: '#ef4444' }} />
            تسجيل عملية سحب
          </h3>
          <FormFields form={form} setForm={setForm}
            label1="وصف السحب *" placeholder1="مثال: شراء بضاعة"
            label2="الهدف من السحب" placeholder2="اكتب تفاصيل إضافية..." />
          {msg && <MsgBox msg={msg} />}
          <button onClick={submitWithdraw} disabled={saving} style={styles.withdrawBtn}>
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: 8 }} />جاري الحفظ...</>
              : <><i className="fa-solid fa-floppy-disk" style={{ marginLeft: 8 }} />تسجيل السحب</>}
          </button>
        </div>
      )}

      {/* ══ تسجيل إيداع ══ */}
      {tab === 'deposit' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fa-solid fa-hand-holding-dollar" style={{ marginLeft: 8, color: '#22c55e' }} />
            تسجيل عملية إيداع
          </h3>
          <FormFields form={form} setForm={setForm}
            label1="وصف الإيداع *" placeholder1="مثال: إيداع رأس مال"
            label2="مصدر الإيداع" placeholder2="اكتب تفاصيل إضافية..." />
          {msg && <MsgBox msg={msg} />}
          <button onClick={submitDeposit} disabled={saving} style={styles.depositBtn}>
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: 8 }} />جاري الحفظ...</>
              : <><i className="fa-solid fa-floppy-disk" style={{ marginLeft: 8 }} />تسجيل الإيداع</>}
          </button>
        </div>
      )}

      {/* ══ الأوردرات المكتملة ══ */}
      {tab === 'orders' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fa-solid fa-list-check" style={{ marginLeft: 8, color: '#22c55e' }} />
            الأوردرات المكتملة ({data.deliveredOrders?.length || 0})
          </h3>
          {!data.deliveredOrders?.length
            ? <p style={styles.empty}>لا توجد أوردرات مكتملة بعد</p>
            : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>العميل</th>
                      <th style={styles.th}>المنتجات</th>
                      <th style={styles.th}>الإجمالي</th>
                      <th style={styles.th}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deliveredOrders.map((o, i) => (
                      <tr key={o._id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={styles.td}>#{o.orderId}</td>
                        <td style={styles.td}>
                          {o.customer_id?.F_name} {o.customer_id?.L_name}
                          <br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{o.customer_id?.Phone}</span>
                        </td>
                        <td style={styles.td}>
                          {o.items?.map(item => (
                            <div key={item._id} style={{ fontSize: 12, marginBottom: 2 }}>
                              {item.name} × {item.quantity} = {fmt(item.subtotal)}
                            </div>
                          ))}
                        </td>
                        <td style={{ ...styles.td, color: '#22c55e', fontWeight: 700 }}>{fmt(o.totalPrice)}</td>
                        <td style={styles.td}>{fmtDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ══ سجل السحوبات ══ */}
      {tab === 'withdrawals' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fa-solid fa-file-invoice-dollar" style={{ marginLeft: 8, color: '#ef4444' }} />
            سجل السحوبات ({data.withdrawals?.length || 0})
          </h3>
          {!data.withdrawals?.length
            ? <p style={styles.empty}>لا توجد سحوبات مسجلة بعد</p>
            : (
              <RecordsTable rows={data.withdrawals} amountColor="#ef4444" labelCol="الهدف" />
            )}
        </div>
      )}

      {/* ══ سجل الإيداعات ══ */}
      {tab === 'deposits' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fa-solid fa-piggy-bank" style={{ marginLeft: 8, color: '#8b5cf6' }} />
            سجل الإيداعات ({data.deposits?.length || 0})
          </h3>
          {!data.deposits?.length
            ? <p style={styles.empty}>لا توجد إيداعات مسجلة بعد</p>
            : (
              <RecordsTable rows={data.deposits} amountColor="#8b5cf6" labelCol="المصدر" />
            )}
        </div>
      )}

      {/* ══ السجل الشامل ══ */}
      {tab === 'all' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fa-solid fa-clock-rotate-left" style={{ marginLeft: 8, color: '#176FCA' }} />
            السجل الشامل لكل التحركات المالية ({allRecords.length})
          </h3>
          {!allRecords.length
            ? <p style={styles.empty}>لا توجد سجلات بعد</p>
            : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>النوع</th>
                      <th style={styles.th}>الوصف</th>
                      <th style={styles.th}>التفاصيل</th>
                      <th style={styles.th}>المبلغ</th>
                      <th style={styles.th}>بواسطة</th>
                      <th style={styles.th}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRecords.map((r, i) => {
                      const isIncome     = r.type === 'income';
                      const isDeposit    = r.type === 'deposit';
                      const isWithdrawal = r.type === 'withdrawal';
                      return (
                        <tr key={r._id || i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td style={styles.td}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: isIncome ? '#dcfce7' : isDeposit ? '#ede9fe' : '#fee2e2',
                              color:      isIncome ? '#16a34a' : isDeposit ? '#7c3aed' : '#dc2626',
                            }}>
                              {isIncome ? '💰 إيراد أوردر' : isDeposit ? '🏦 إيداع' : '💸 سحب'}
                            </span>
                          </td>
                          <td style={styles.td}>{r.description}</td>
                          <td style={styles.td}>
                            {r.orderId ? `أوردر #${r.orderId}` : r.purpose || '-'}
                          </td>
                          <td style={{
                            ...styles.td, fontWeight: 700,
                            color: isWithdrawal ? '#ef4444' : isDeposit ? '#8b5cf6' : '#22c55e'
                          }}>
                            {isWithdrawal ? '−' : '+'}{fmt(r.amount)}
                          </td>
                          <td style={styles.td}>{r.doneBy?.name || (isIncome ? 'نظام' : 'أدمن')}</td>
                          <td style={styles.td}>{fmtDate(r.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────
function StatCard({ icon, label, value, color, bg }) {
  return (
    <div style={{ ...styles.statCard, background: bg }}>
      <div style={{ ...styles.statIcon, color, background: color + '20' }}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div>
        <p style={styles.statLabel}>{label}</p>
        <p style={{ ...styles.statValue, color }}>{value}</p>
      </div>
    </div>
  );
}

function FormFields({ form, setForm, label1, placeholder1, label2, placeholder2 }) {
  return (
    <div style={styles.formGrid}>
      <div style={styles.formGroup}>
        <label style={styles.label}>المبلغ (جنيه) *</label>
        <input type="number" placeholder="0" value={form.amount}
          onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
          style={styles.input} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{label1}</label>
        <input type="text" placeholder={placeholder1} value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          style={styles.input} />
      </div>
      <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
        <label style={styles.label}>{label2}</label>
        <textarea placeholder={placeholder2} value={form.purpose}
          onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
          style={{ ...styles.input, height: 80, resize: 'none' }} />
      </div>
    </div>
  );
}

function RecordsTable({ rows, amountColor, labelCol }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={styles.th}>الوصف</th>
            <th style={styles.th}>{labelCol}</th>
            <th style={styles.th}>المبلغ</th>
            <th style={styles.th}>بواسطة</th>
            <th style={styles.th}>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
              <td style={styles.td}>{r.description}</td>
              <td style={styles.td}>{r.purpose || '-'}</td>
              <td style={{ ...styles.td, color: amountColor, fontWeight: 700 }}>{fmt(r.amount)}</td>
              <td style={styles.td}>{r.doneBy?.name || 'أدمن'}</td>
              <td style={styles.td}>{fmtDate(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MsgBox({ msg }) {
  return (
    <p style={{ color: msg.startsWith('✅') ? '#22c55e' : '#ef4444', marginBottom: 12, fontWeight: 700 }}>
      {msg}
    </p>
  );
}

// ── Styles ──────────────────────────────────────────────
const f = 'Cairo, sans-serif';
const styles = {
  root:        { fontFamily: f, direction: 'rtl', padding: 0 },
  center:      { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title:       { margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' },
  subtitle:    { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  refreshBtn:  { background: '#eff6ff', color: '#176FCA', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontFamily: f, fontWeight: 700, fontSize: 13 },
  cards:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 24 },
  statCard:    { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  statIcon:    { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  statLabel:   { margin: 0, fontSize: 12, color: '#64748b', marginBottom: 2 },
  statValue:   { margin: 0, fontSize: 18, fontWeight: 800 },
  tabs:        { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab:         { padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: f, fontSize: 13, color: '#64748b', transition: 'all 0.2s' },
  tabActive:   { background: '#176FCA', color: 'white', border: '1.5px solid #176FCA', fontWeight: 700 },
  card:        { background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 20 },
  cardTitle:   { margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: '#1e293b' },
  formGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  formGroup:   { display: 'flex', flexDirection: 'column', gap: 6 },
  label:       { fontSize: 13, fontWeight: 700, color: '#374151' },
  input:       { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: f, direction: 'rtl', outline: 'none' },
  withdrawBtn: { background: '#ef4444', color: 'white', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontFamily: f, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' },
  depositBtn:  { background: '#22c55e', color: 'white', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontFamily: f, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' },
  tableWrap:   { overflowX: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead:       { background: '#f8fafc' },
  th:          { padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #f1f5f9' },
  td:          { padding: '10px 14px', borderBottom: '1px solid #f8fafc', color: '#1e293b' },
  empty:       { textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 14 },
};