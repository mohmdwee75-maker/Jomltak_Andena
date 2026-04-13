require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/Admin');

const EMAIL    = 'mohmadwe75@gmail.com';
const PASSWORD = 'Admin@2025';   // ← كلمة مرور مبدائية، غيّرها بعدين
const NAME     = 'Mohammed Ayman';
const PHONE    = '01006658620';

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB ✅');

  const exists = await Admin.findOne({ email: EMAIL });
  if (exists) {
    console.log('⚠️  الحساب موجود بالفعل:', EMAIL);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const admin = new Admin({
    adminId: 1,
    name: NAME,
    email: EMAIL,
    password: hashedPassword,
    phone: PHONE,
    role: 'admin'
  });

  await admin.save();
  console.log('✅ تم إنشاء حساب الأدمن بنجاح!');
  console.log('📧 الإيميل  :', EMAIL);
  console.log('🔑 الباسورد :', PASSWORD);
  console.log('⚠️  غيّر الباسورد بعد أول تسجيل دخول!');
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
