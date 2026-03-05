const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const FinancialRecord = require('../models/FinancialRecord');
const verifyToken = require('../middleware/verifyToken');

// ── Middleware: أدمن فقط ──
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'أدمن فقط' });
  next();
};

// ─────────────────────────────────────────────
// GET /api/financial/summary
// ملخص مالي كامل (أوتوماتيك من الأوردرات)
// ─────────────────────────────────────────────
router.get('/summary', verifyToken, adminOnly, async (req, res) => {
  try {
    const deliveredOrders = await Order.find({ status: 'delivered' })
      .populate('customer_id', 'F_name L_name Phone')
      .sort({ createdAt: -1 });

    const totalIncome = deliveredOrders.reduce((s, o) => s + o.totalPrice, 0);
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const deliveredCount = deliveredOrders.length;

    const withdrawals = await FinancialRecord.find({ type: 'withdrawal' }).sort({ createdAt: -1 });
    const totalWithdrawals = withdrawals.reduce((s, r) => s + r.amount, 0);

    const deposits = await FinancialRecord.find({ type: 'deposit' }).sort({ createdAt: -1 });
    const totalDeposits = deposits.reduce((s, r) => s + r.amount, 0);

    res.json({
      totalIncome,
      totalWithdrawals,
      totalDeposits,
      netBalance: totalIncome + totalDeposits - totalWithdrawals,
      totalOrders,
      pendingOrders,
      deliveredCount,
      deliveredOrders,
      withdrawals,
      deposits,
    });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
});

// ─────────────────────────────────────────────
// POST /api/financial/withdraw
// تسجيل سحب يدوي
// ─────────────────────────────────────────────
router.post('/withdraw', verifyToken, adminOnly, async (req, res) => {
  try {
    const { amount, description, purpose } = req.body;
    if (!amount || !description)
      return res.status(400).json({ message: 'المبلغ والوصف مطلوبان' });

    const record = await FinancialRecord.create({
      type: 'withdrawal',
      amount: Number(amount),
      description,
      purpose: purpose || '',
      doneBy: {
        admin_id: req.user.userId,
        name: req.user.name || 'أدمن',
      },
    });

    res.status(201).json({ message: 'تم تسجيل السحب بنجاح', record });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
});

// ─────────────────────────────────────────────
// GET /api/financial/records
// كل السجلات
// ─────────────────────────────────────────────
router.get('/records', verifyToken, adminOnly, async (req, res) => {
  try {
    const records = await FinancialRecord.find().sort({ createdAt: -1 });
    res.json({ records });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
});
router.post('/deposit', verifyToken, adminOnly, async (req, res) => {
  try {
    const { amount, description, purpose } = req.body;
    if (!amount || !description)
      return res.status(400).json({ message: 'المبلغ والوصف مطلوبان' });

    const record = await FinancialRecord.create({
      type: 'deposit',
      amount: Number(amount),
      description,
      purpose: purpose || '',
      doneBy: {
        admin_id: req.user.userId,
        name: req.user.name || 'أدمن',
      },
    });

    res.status(201).json({ message: 'تم تسجيل الإيداع بنجاح', record });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
});
module.exports = router;