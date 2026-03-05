// middleware/upload.js
const multer = require('multer');

// تخزين مؤقت في الميموري (مش على الهارد)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع ملف غير مسموح'));
    }
  }
});

module.exports = upload;