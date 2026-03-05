require('dotenv').config();
const express = require("express");
const http = require("http");          // ← جديد
const { Server } = require("socket.io");   // ← جديد
const mongoose = require("mongoose");
const Admin = require("./models/Admin");
const Customer = require("./models/Customer");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const commentRoutes = require('./routes/commentRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const financialRoutes = require('./routes/financialRoutes');
const upload = require('./middleware/upload');
const cloudinary = require('./config/cloudinary');
const supplierRoutes = require('./routes/supplierRoutes'); // ← جديد
const app = express();
const server = http.createServer(app);     // ← جديد
app.use(require('helmet')());

// ── Socket.io ──────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket middleware — التحقق من التوكن
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('غير مصرح'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('توكن غير صالح'));
  }
});

io.on('connection', (socket) => {
  const { userId, role } = socket.user;
  console.log(`🔌 connected: ${role} - ${userId}`);

  // كل يوزر يدخل room باسم الـ userId بتاعه
  socket.join(role === 'admin' ? 'admins' : `customer_${userId}`);

  // ── العميل بيبعت رسالة ──────────────────────────
  socket.on('customer_message', async ({ text }) => {
    if (!text?.trim() || role !== 'customer') return;
    if (text.length > 2000) return; // ✅ حد أقصى لطول الرسالة
    try {
      const msg = { from: 'customer', text: text.trim(), sentAt: new Date(), isRead: false };
      await Customer.findByIdAndUpdate(userId, { $push: { messages: msg } });
      // ابعت للأدمن
      io.to('admins').emit('new_message', { customerId: userId, message: msg });
      // أكدلله إنه اتبعت
      socket.emit('message_sent', msg);
    } catch (err) {
      console.error('customer_message error:', err.message);
    }
  });

  // ── الأدمن بيبعت رسالة ──────────────────────────
  socket.on('admin_message', async ({ customerId, text }) => {
    if (!text?.trim() || role !== 'admin') return;
    if (text.length > 2000) return; // ✅ حد أقصى لطول الرسالة
    try {
      const msg = { from: 'admin', text: text.trim(), sentAt: new Date(), isRead: false };
      await Customer.findByIdAndUpdate(customerId, { $push: { messages: msg } });
      // ابعت للعميل
      io.to(`customer_${customerId}`).emit('new_message', { customerId, message: msg });
      // أكدلله
      socket.emit('message_sent', { customerId, message: msg });
    } catch (err) {
      console.error('admin_message error:', err.message);
    }
  });

  // ── تحديد رسائل كمقروءة ─────────────────────────
  socket.on('mark_read', async ({ customerId }) => {
    try {
      const targetId = role === 'admin' ? customerId : userId;
      const fromWho = role === 'admin' ? 'customer' : 'admin';
      await Customer.updateOne(
        { _id: targetId },
        { $set: { 'messages.$[el].isRead': true } },
        { arrayFilters: [{ 'el.from': fromWho, 'el.isRead': false }] }
      );
    } catch (err) {
      console.error('mark_read error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ disconnected: ${role} - ${userId}`);
  });
});

// ── Express Middleware ──────────────────────────
// ️للتفعيل Helmet لحماية HTTP Headers:
//   npm install helmet  ثم  app.use(require('helmet')())
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN,
  credentials: true
}));
// ✅ حد حجم الـ JSON body — حماية من DoS
app.use(express.json({ limit: '1mb' }));

// ── MongoDB ───────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected successfully ✅"))
  .catch((err) => {
    console.log("Error connecting to DB ❌", err.message);
    process.exit(1);
  });

// ── Rate Limiters ────────────────────────────
// ✅ Rate Limit عام على كل الـ API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { message: "كتير أوي من الطلبات, استنى شوية" }
});
app.use('/api', globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { message: "كتير أوي، استنى شوية وحاول تاني" }
});
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, max: 3,
  message: { message: "استنى شوية قبل ما تطلب كود تاني" }
});

// ── verifyToken Middleware ──────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ message: "غير مصرح" });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token منتهي أو غير صالح" });
  }
};

// ── OTP Routes ──────────────────────────────────────────
const otpStore = {};

app.post("/send-otp", otpLimiter, async (req, res) => {
  const { phoneNumber } = req.body;
  const existingUser = await Customer.findOne({ Phone: phoneNumber });
  if (existingUser) return res.status(400).json({ message: "هذا الرقم مسجل بالفعل" });
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore[phoneNumber] = { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 };
  // ⚠️ TODO: احذف السطر ده لما تربط SMS — مؤقت للتطوير فقط
  console.log(`[DEV] OTP for ${phoneNumber}: ${otp}`);
  res.json({ message: "تم إرسال الكود بنجاح" });
});

app.post("/verify-otp", async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const stored = otpStore[phoneNumber];
  if (!stored) return res.status(400).json({ message: "لم يتم إرسال كود لهذا الرقم" });
  if (Date.now() > stored.expiresAt) {
    delete otpStore[phoneNumber];
    return res.status(400).json({ message: "انتهت صلاحية الكود" });
  }
  if (stored.code !== otp) return res.status(400).json({ message: "الكود غير صحيح" });
  delete otpStore[phoneNumber];
  const token = jwt.sign({ phoneNumber }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: "تم التحقق بنجاح", token });
});

app.post("/resend-otp", otpLimiter, async (req, res) => {
  const { phoneNumber } = req.body;
  // ✅ تحقق إن الرقم في مرحلة تسجيل فعلاً (otpStore) أو مش مسجل بعد
  const alreadyRegistered = await Customer.findOne({ Phone: phoneNumber });
  if (alreadyRegistered) return res.status(400).json({ message: "هذا الرقم مسجل بالفعل" });

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore[phoneNumber] = { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 };
  // ⚠️ TODO: احذف السطر ده لما تربط SMS — مؤقت للتطوير فقط
  res.json({ message: "تم إعادة إرسال الكود بنجاح" });
});


// ── Auth Routes ─────────────────────────────────────────
app.post("/login_details", verifyToken, async (req, res) => {
  const { firstName, lastName, birthDate, city } = req.body;
  const newToken = jwt.sign(
    { phoneNumber: req.user.phoneNumber, firstName, lastName, birthDate, city },
    process.env.JWT_SECRET, { expiresIn: '1h' }
  );
  res.json({ message: "تم الحفظ بنجاح", token: newToken });
});

app.post("/save_account_details", verifyToken, async (req, res) => {
  try {
    const { phoneNumber, firstName, lastName, birthDate, city } = req.user;

    // ✅ تحقق من قوة الباسورد عند إنشاء الحساب
    const password = req.body.password;
    if (!password || password.length < 10)
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 10 خانات على الأقل' });
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      return res.status(400).json({ message: 'كلمة المرور يجب أن تحتوي على حروف وأرقام' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const lastCustomer = await Customer.findOne().sort({ user_ID: -1 });
    const newID = lastCustomer ? lastCustomer.user_ID + 1 : 1;
    const newCustomer = new Customer({
      user_ID: newID, F_name: firstName, L_name: lastName,
      Birth_date: birthDate, city, Phone: phoneNumber,
      User_name: phoneNumber, Pass: hashedPassword,
      notes: "", order_count: 0, image: ""
    });
    await newCustomer.save();
    const finalToken = jwt.sign(
      { phoneNumber, userId: newCustomer._id, role: 'customer', firstName },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ message: "تم إنشاء الحساب بنجاح", token: finalToken });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.post("/signin", loginLimiter, async (req, res) => {
  const { phoneNumber, password } = req.body;
  try {
    const admin = await Admin.findOne({ email: phoneNumber });
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (isMatch) {
        const token = jwt.sign(
          { userId: admin._id, role: 'admin', name: admin.name },
          process.env.JWT_SECRET, { expiresIn: '7d' }
        );
        return res.json({
          message: "تم تسجيل الدخول بنجاح", token,
          user: { id: admin._id, name: admin.name, role: 'admin' }
        });
      }
    }

    const customer = await Customer.findOne({ Phone: phoneNumber });
    if (!customer) return res.status(400).json({ message: "البيانات غير صحيحة" });

    const isMatch = await bcrypt.compare(password, customer.Pass);
    if (!isMatch) return res.status(400).json({ message: "البيانات غير صحيحة" });

    // ─── ✅ Ban Check ──────────────────────────────────────────────────
    if (customer.isBanned && customer.bannedUntil) {
      const now = new Date();
      if (new Date(customer.bannedUntil) > now) {
        return res.status(403).json({
          message: "حسابك محظور",
          isBanned: true,
          bannedUntil: customer.bannedUntil
        });
      }
    }
    // ──────────────────────────────────────────────────────────────────

    const token = jwt.sign(
      { phoneNumber, userId: customer._id, role: 'customer', firstName: customer.F_name },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );

    return res.json({
      message: "تم تسجيل الدخول بنجاح", token,
      user: {
        id: customer._id,
        firstName: customer.F_name,
        phoneNumber: customer.Phone,
        role: 'customer',
        isBanned: customer.isBanned,         // ✅ مضاف
        bannedUntil: customer.bannedUntil    // ✅ مضاف
      }
    });

  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ في الخادم" });
  }
});
// ── Wishlist Routes ─────────────────────────────────────
app.post("/api/wishlist/add", verifyToken, async (req, res) => {
  try {
    await Customer.findByIdAndUpdate(req.user.userId,
      { $addToSet: { wishlist: req.body.productId } });
    res.json({ message: "تمت الإضافة بنجاح" });
  } catch { res.status(500).json({ message: "حصل خطأ" }); }
});

app.get("/api/wishlist", verifyToken, async (req, res) => {
  try {
    const user = await Customer.findById(req.user.userId);
    res.json({ wishlist: user.wishlist });
  } catch { res.status(500).json({ message: "حصل خطأ" }); }
});

app.post("/api/wishlist/remove", verifyToken, async (req, res) => {
  try {
    await Customer.findByIdAndUpdate(req.user.userId,
      { $pull: { wishlist: req.body.productId } });
    res.json({ message: "تمت الإزالة بنجاح" });
  } catch { res.status(500).json({ message: "حصل خطأ" }); }
});


// ─────────────────────────────────────
// ✅ رفع صورة البروفايل (Avatar)
// محمي بـ verifyToken + فحص أمان كامل
// ─────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ضيف الـ endpoints دول في server.js بتاعك
// قبل سطر server.listen
// ─────────────────────────────────────────────────────────────

// ── GET /api/user/profile ─────────────────────────────────
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    // تأكد إن المستخدم customer مش admin
    if (req.user.role !== 'customer')
      return res.status(403).json({ message: 'غير مسموح' });

    const customer = await Customer.findById(req.user.userId).select('-Pass');
    if (!customer) return res.status(404).json({ message: 'المستخدم غير موجود' });

    res.json({
      image: customer.image || '',
      firstName: customer.F_name || '',
      lastName: customer.L_name || '',
      birthDate: customer.Birth_date || '',
      phone: customer.Phone || '',
      city: customer.city || '',
    });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
});


// ── PUT /api/user/profile ─────────────────────────────────
// تعديل بيانات المستخدم بشكل آمن
app.put('/api/user/profile', verifyToken, async (req, res) => {
  try {
    // 1. تأكد إن المستخدم customer فقط
    if (req.user.role !== 'customer')
      return res.status(403).json({ message: 'غير مسموح' });

    // 2. اسمح بس بالحقول دي — أي حقل تاني يتتجاهل
    const { firstName, lastName, birthDate, city } = req.body;

    // 3. validation على الباك
    if (!firstName?.trim() || firstName.trim().length < 2)
      return res.status(400).json({ message: 'الإسم الأول يجب أن يكون حرفين على الأقل' });
    if (!lastName?.trim() || lastName.trim().length < 2)
      return res.status(400).json({ message: 'الكنية يجب أن تكون حرفين على الأقل' });
    if (!city?.trim())
      return res.status(400).json({ message: 'المدينة مطلوبة' });
    if (birthDate) {
      const d = new Date(birthDate);
      if (isNaN(d.getTime())) return res.status(400).json({ message: 'تاريخ الميلاد غير صحيح' });
      if (d > new Date()) return res.status(400).json({ message: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل' });
    }

    // 4. حدّث بس الحقول المسموح بيها
    const updated = await Customer.findByIdAndUpdate(
      req.user.userId,
      {
        F_name: firstName.trim(),
        L_name: lastName.trim(),
        city: city.trim(),
        ...(birthDate && { Birth_date: new Date(birthDate) })
      },
      { new: true, select: '-Pass' }  // ارجع المستخدم بدون الباسورد
    );

    if (!updated) return res.status(404).json({ message: 'المستخدم غير موجود' });

    res.json({
      message: 'تم تحديث البيانات بنجاح',
      firstName: updated.F_name,
      lastName: updated.L_name,
      city: updated.city,
      birthDate: updated.Birth_date,
    });

  } catch (err) {
    console.error('❌ خطأ في تحديث البروفايل:', err.message);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});
app.post('/api/user/change-password', verifyToken, async (req, res) => {
  try {
    // 1. customer فقط
    if (req.user.role !== 'customer')
      return res.status(403).json({ message: 'غير مسموح' });

    const { oldPassword, newPassword } = req.body;

    // 2. validation
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });

    if (newPassword.length < 10)
      return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 10 خانات على الأقل' });

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword))
      return res.status(400).json({ message: 'كلمة المرور يجب أن تحتوي على حروف وأرقام' });

    if (oldPassword === newPassword)
      return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية' });

    // 3. جيب المستخدم
    const customer = await Customer.findById(req.user.userId);
    if (!customer) return res.status(404).json({ message: 'المستخدم غير موجود' });

    // 4. تحقق من الباسورد القديمة
    const isMatch = await bcrypt.compare(oldPassword, customer.Pass);
    if (!isMatch)
      return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });

    // 5. hash الباسورد الجديدة واحفظها
    const hashed = await bcrypt.hash(newPassword, 10);
    await Customer.findByIdAndUpdate(req.user.userId, { Pass: hashed });

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });

  } catch (err) {
    console.error('❌ خطأ في تغيير كلمة المرور:', err.message);
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

app.post('/api/user/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'لم يتم إرسال صورة' });

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype))
      return res.status(400).json({ message: 'نوع الملف غير مسموح - صور jpeg/png/webp فقط' });

    if (req.file.size > 5 * 1024 * 1024)
      return res.status(400).json({ message: 'حجم الصورة كبير - الحد الأقصى 5MB' });

    const customer = await Customer.findById(req.user.userId);
    if (!customer) return res.status(404).json({ message: 'المستخدم غير موجود' });

    // امسح الصورة القديمة من Cloudinary
    if (customer.image) {
      try {
        const parts = customer.image.split('/');
        const publicId = 'avatars/' + parts[parts.length - 1].split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.warn('⚠️ فشل حذف الصورة القديمة:', e.message);
      }
    }

    // ارفع الصورة الجديدة
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          resource_type: 'image',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
          invalidate: true,
        },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    await Customer.findByIdAndUpdate(req.user.userId, { image: uploadResult.secure_url });

    res.json({ message: 'تم رفع الصورة بنجاح', avatarUrl: uploadResult.secure_url });

  } catch (err) {
    console.error('❌ خطأ في رفع الـ avatar:', err.message);
    res.status(500).json({ message: 'حدث خطأ في رفع الصورة' });
  }
});


// ── API Routes ──────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/supplier', supplierRoutes);
// ── Start Server ────────────────────────────────────────
// ⚠️ مهم: server.listen مش app.listen عشان Socket.io يشتغل
server.listen(5000, '0.0.0.0', () => {
  console.log("Server running on port 5000 🚀");
});