const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');
const verifyToken = require('../middleware/verifyToken');

const formatPhone = (raw) => {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('20')) return `+${digits}`;
  if (digits.startsWith('0')) return `+20${digits.slice(1)}`;
  return `+20${digits}`;
};

const isSupplier = (req, res, next) => {
  if (req.user?.role !== 'supplier')
    return res.status(403).json({ message: 'هذا المسار للموردين فقط' });
  next();
};

// ══════════════════════════════════════════════════════════
//  POST /api/supplier/login
// ══════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password)
      return res.status(400).json({ message: 'رقم الهاتف وكلمة المرور مطلوبان' });

    const formatted = formatPhone(phoneNumber);
    const supplier = await Supplier.findOne({ phone: formatted });
    if (!supplier)
      return res.status(400).json({ message: 'البيانات غير صحيحة' });

    if (!supplier.isActive)
      return res.status(403).json({ message: 'حسابك معطل، تواصل مع الإدارة' });

    const isMatch = await bcrypt.compare(password, supplier.password);
    if (!isMatch)
      return res.status(400).json({ message: 'البيانات غير صحيحة' });

    const token = jwt.sign(
      { userId: supplier._id, supplierId: supplier.supplierId, name: supplier.name, role: 'supplier' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: supplier.supplierId,
        name: supplier.name,
        phone: supplier.phone,
        company: supplier.company,
        image: supplier.image,
        role: 'supplier',
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════════════
//  GET /api/supplier/me
// ══════════════════════════════════════════════════════════
router.get('/me', verifyToken, isSupplier, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.user.userId).select('-password');
    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════════════
//  PUT /api/supplier/me/update — تعديل بيانات المورد
// ══════════════════════════════════════════════════════════
router.put('/me/update', verifyToken, isSupplier, async (req, res) => {
  try {
    const { name, company, notes } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: 'الاسم مطلوب' });

    const supplier = await Supplier.findByIdAndUpdate(
      req.user.userId,
      { name: name.trim(), company: company || '', notes: notes || '' },
      { new: true }
    ).select('-password');

    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });
    res.json({ success: true, message: 'تم تحديث البيانات بنجاح', supplier });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════════════
//  PATCH /api/supplier/me/password — تغيير كلمة المرور
// ══════════════════════════════════════════════════════════
router.patch('/me/password', verifyToken, isSupplier, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });

    if (newPassword.length < 10)
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 10 خانات على الأقل' });

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword))
      return res.status(400).json({ message: 'كلمة المرور يجب أن تحتوي على حروف وأرقام' });

    const supplier = await Supplier.findById(req.user.userId);
    if (!supplier) return res.status(404).json({ message: 'المورد غير موجود' });

    const isMatch = await bcrypt.compare(currentPassword, supplier.password);
    if (!isMatch)
      return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });

    supplier.password = await bcrypt.hash(newPassword, 10);
    await supplier.save();

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════════════
//  GET /api/supplier/orders
// ══════════════════════════════════════════════════════════
router.get('/orders', verifyToken, isSupplier, async (req, res) => {
  try {
    const { status } = req.query;
    const allowedStatuses = ['admin_approved', 'supplier_approved', 'shipped', 'delivered', 'rejected'];
    const filter = status && allowedStatuses.includes(status)
      ? { status }
      : { status: { $in: allowedStatuses } };

    const orders = await Order.find(filter)
      .populate('customer_id', 'F_name L_name Phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════════════
//  GET /api/supplier/orders/:orderId
// ══════════════════════════════════════════════════════════
router.get('/orders/:orderId', verifyToken, isSupplier, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: Number(req.params.orderId) })
      .populate('customer_id', 'F_name L_name Phone')
      .populate('adminApproval.admin_id', 'name');

    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    const allowedStatuses = ['admin_approved', 'supplier_approved', 'shipped', 'delivered', 'rejected'];
    if (!allowedStatuses.includes(order.status))
      return res.status(403).json({ message: 'هذا الطلب غير متاح لك' });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════════════
//  PATCH /api/supplier/orders/:orderId/approve
// ══════════════════════════════════════════════════════════
router.patch('/orders/:orderId/approve', verifyToken, isSupplier, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: Number(req.params.orderId) });
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (order.status !== 'admin_approved')
      return res.status(400).json({ message: 'لا يمكن قبول هذا الطلب الآن' });

    order.status = 'supplier_approved';
    order.supplierApproval = { supplier_id: req.user.userId, approvedAt: new Date() };
    await order.save();

    res.json({ success: true, message: 'تم قبول الطلب بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════════════
//  PATCH /api/supplier/orders/:orderId/reject
// ══════════════════════════════════════════════════════════
router.patch('/orders/:orderId/reject', verifyToken, isSupplier, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: Number(req.params.orderId) });
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (order.status !== 'admin_approved')
      return res.status(400).json({ message: 'لا يمكن رفض هذا الطلب الآن' });

    order.status = 'rejected';
    order.supplierApproval = { supplier_id: req.user.userId, rejectedAt: new Date() };
    await order.save();

    res.json({ success: true, message: 'تم رفض الطلب' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════════════
//  GET /api/supplier/stats
// ══════════════════════════════════════════════════════════
router.get('/stats', verifyToken, isSupplier, async (req, res) => {
  try {
    const months = Math.min(Math.max(Number(req.query.months) || 1, 1), 3);
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const totalIncoming = await Order.countDocuments({
      status: { $in: ['admin_approved', 'supplier_approved', 'shipped', 'delivered', 'rejected'] },
      createdAt: { $gte: since },
    });

    const deliveredOrders = await Order.find({ status: 'delivered', createdAt: { $gte: since } })
      .sort({ createdAt: -1 });

    const totalDelivered = deliveredOrders.length;
    const pendingApproval = await Order.countDocuments({ status: 'admin_approved', createdAt: { $gte: since } });
    const rejected = await Order.countDocuments({ status: 'rejected', createdAt: { $gte: since } });
    const inProgress = await Order.countDocuments({ status: { $in: ['supplier_approved', 'shipped'] }, createdAt: { $gte: since } });
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    const monthlyBreakdown = [];
    for (let i = months - 1; i >= 0; i--) {
      const from = new Date(); from.setMonth(from.getMonth() - i - 1); from.setDate(1); from.setHours(0, 0, 0, 0);
      const to = new Date(); to.setMonth(to.getMonth() - i); to.setDate(0); to.setHours(23, 59, 59, 999);
      const count = await Order.countDocuments({ status: 'delivered', createdAt: { $gte: from, $lte: to } });
      monthlyBreakdown.push({
        month: from.toLocaleString('ar-EG', { month: 'long', year: 'numeric' }),
        delivered: count
      });
    }

    res.json({
      success: true,
      period: `آخر ${months === 1 ? 'شهر' : months === 2 ? 'شهرين' : '3 شهور'}`,
      months,
      stats: {
        totalIncoming, totalDelivered, pendingApproval,
        inProgress, rejected, totalRevenue,
        deliveryRate: totalIncoming > 0
          ? ((totalDelivered / totalIncoming) * 100).toFixed(1) + '%'
          : '0%',
      },
      monthlyBreakdown,
      recentDelivered: deliveredOrders.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;