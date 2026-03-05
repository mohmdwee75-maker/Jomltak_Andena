const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

// ✅ Rate limiter للـ admin login
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { message: 'كتير أوي، استنى شوية وحاول تاني' }
});

// ── Middleware: تأكد إن المستخدم أدمن ──────────────
function isAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'ليس أدمن' });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'توكن غير صالح' });
  }
}

// ── Middleware: verifyToken (للعميل نفسه) ──────────
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'توكن غير صالح' });
  }
};

// ══════════════════════════════════════════════════
//  Admin Auth
// ══════════════════════════════════════════════════

// ⚠️ محمي بـ isAdmin — فقط أدمن موجود يقدر يضيف أدمن جديد
router.post('/register', isAdmin, async (req, res) => {
  try {
    const existingAdmin = await Admin.findOne({ email: req.body.email });
    if (existingAdmin) return res.status(400).json({ message: 'الإيميل مسجل بالفعل' });

    const lastAdmin = await Admin.findOne().sort({ adminId: -1 });
    const newAdminId = (lastAdmin?.adminId || 0) + 1;
    const hashed = await bcrypt.hash(req.body.password, 10);

    const admin = new Admin({
      adminId: newAdminId,
      name: req.body.name,
      email: req.body.email,
      password: hashed,
      phone: req.body.phone || ''
    });

    await admin.save();
    res.status(201).json({ success: true, message: 'تم إنشاء الأدمين بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

router.post('/login', adminLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'البيانات غير صحيحة' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'البيانات غير صحيحة' });

    const token = jwt.sign(
      { userId: admin._id, adminId: admin.adminId, name: admin.name, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      admin: { id: admin.adminId, name: admin.name, email: admin.email }
    });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

router.post('/add-admin', isAdmin, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'ملأ كل الحقول المطلوبة' });

    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ message: 'الإيميل مسجل بالفعل' });

    const lastAdmin = await Admin.findOne().sort({ adminId: -1 });
    const adminId = (lastAdmin?.adminId || 0) + 1;
    const hashed = await bcrypt.hash(password, 10);

    await new Admin({ adminId, name, email, password: hashed, phone: phone || '' }).save();
    res.status(201).json({ success: true, message: 'تم إضافة الأدمن' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════
//  Supplier Management (أدمن فقط)
// ══════════════════════════════════════════════════

// ── جلب كل السبلايرز ──────────────────────────────
// GET /api/admin/suppliers
router.get('/suppliers', isAdmin, async (req, res) => {
  try {
    const suppliers = await Supplier.find().select('-password').sort({ supplierId: 1 });
    res.json({ success: true, suppliers });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ── إضافة سبلير جديد ──────────────────────────────
// POST /api/admin/suppliers
// body: { name, phone, password, company, notes }
router.post('/suppliers', isAdmin, async (req, res) => {
  try {
    const { name, phone, password, company, notes } = req.body;

    // ✅ التحقق بالـ phone بدل email
    if (!name || !phone || !password)
      return res.status(400).json({ message: 'الاسم ورقم الهاتف وكلمة المرور مطلوبين' });

    // ✅ تأكد إن الرقم مش متسجل قبل كده
    const exists = await Supplier.findOne({ phone });
    if (exists) return res.status(400).json({ message: 'رقم الهاتف مسجل بالفعل' });

    const last = await Supplier.findOne().sort({ supplierId: -1 });
    const supplierId = (last?.supplierId || 0) + 1;
    const hashed = await bcrypt.hash(password, 10);

    const supplier = await new Supplier({
      supplierId,
      name,
      phone,
      password: hashed,
      company: company || '',
      notes: notes || '',
    }).save();

    const { password: _, ...data } = supplier.toObject();
    res.status(201).json({ success: true, message: 'تم إضافة السبلير بنجاح', supplier: data });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ── تعديل بيانات سبلير ────────────────────────────
// PUT /api/admin/suppliers/:id
// body: { name, phone, company, notes, isActive, rating }
router.put('/suppliers/:id', isAdmin, async (req, res) => {
  try {
    const { name, phone, company, notes, isActive, rating } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (company !== undefined) update.company = company;
    if (notes !== undefined) update.notes = notes;
    if (isActive !== undefined) update.isActive = isActive;
    if (rating !== undefined) update.rating = Math.min(5, Math.max(0, Number(rating)));

    const supplier = await Supplier.findOneAndUpdate(
      { supplierId: Number(req.params.id) },
      update,
      { new: true }
    ).select('-password');

    if (!supplier) return res.status(404).json({ message: 'السبلير غير موجود' });
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ── تغيير كلمة مرور سبلير ─────────────────────────
// PATCH /api/admin/suppliers/:id/password
// body: { newPassword }
router.patch('/suppliers/:id/password', isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 خانات على الأقل' });

    const hashed = await bcrypt.hash(newPassword, 10);
    const supplier = await Supplier.findOneAndUpdate(
      { supplierId: Number(req.params.id) },
      { password: hashed },
      { new: true }
    ).select('-password');

    if (!supplier) return res.status(404).json({ message: 'السبلير غير موجود' });
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ── تفعيل / تعطيل سبلير ───────────────────────────
// PATCH /api/admin/suppliers/:id/toggle
router.patch('/suppliers/:id/toggle', isAdmin, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ supplierId: Number(req.params.id) });
    if (!supplier) return res.status(404).json({ message: 'السبلير غير موجود' });

    supplier.isActive = !supplier.isActive;
    await supplier.save();

    res.json({
      success: true,
      message: supplier.isActive ? 'تم تفعيل السبلير' : 'تم تعطيل السبلير',
      isActive: supplier.isActive
    });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ── حذف سبلير ─────────────────────────────────────
// DELETE /api/admin/suppliers/:id
router.delete('/suppliers/:id', isAdmin, async (req, res) => {
  try {
    await Supplier.findOneAndDelete({ supplierId: Number(req.params.id) });
    res.json({ success: true, message: 'تم حذف السبلير' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ══════════════════════════════════════════════════
//  Customer Management
// ══════════════════════════════════════════════════

router.get('/customers', isAdmin, async (req, res) => {
  try {
    const customers = await Customer.find().select('-Pass -wishlist').sort({ user_ID: 1 });
    res.json({ success: true, customers });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/customers/:id', isAdmin, async (req, res) => {
  try {
    await Customer.findOneAndDelete({ user_ID: Number(req.params.id) });
    res.json({ success: true, message: 'تم حذف العميل' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

router.patch('/customers/:id/ban', isAdmin, async (req, res) => {
  try {
    const { days } = req.body;
    const update = (!days || days <= 0)
      ? { isBanned: false, bannedUntil: null }
      : { isBanned: true, bannedUntil: new Date(Date.now() + days * 86400000) };

    const customer = await Customer.findOneAndUpdate(
      { user_ID: Number(req.params.id) },
      update,
      { new: true }
    );
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

router.post('/customers/:id/message', isAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'الرسالة فارغة' });

    const customer = await Customer.findOneAndUpdate(
      { user_ID: Number(req.params.id) },
      { $push: { messages: { text, from: 'admin', sentAt: new Date() } } },
      { new: true }
    );
    res.json({ success: true, messages: customer.messages });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

router.get('/inbox', verifyToken, async (req, res) => {
  try {
    const customer = await Customer.findById(req.user.userId).select('messages F_name');
    if (!customer) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.json({ success: true, messages: customer.messages || [] });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

router.patch('/inbox/:msgId/read', verifyToken, async (req, res) => {
  try {
    await Customer.updateOne(
      { _id: req.user.userId, 'messages._id': req.params.msgId },
      { $set: { 'messages.$.isRead': true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;