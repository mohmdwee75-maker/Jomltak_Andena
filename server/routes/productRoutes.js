const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const Product = require('../models/Product');       // ✅ مرة واحدة بس
const cloudinary = require('../config/cloudinary');
const jwt = require('jsonwebtoken');

// ✅ حماية من ReDoS — escape الـ regex characters من input المستخدم
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── verifyToken ──────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "غير مصرح" });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token منتهي أو غير صالح" });
  }
};

// ── verifyAdmin ──────────────────────────
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'مش مسموح - Admin فقط' });
  }
  next();
};

// دالة رفع لـ Cloudinary
const uploadToCloudinary = (buffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const isVideo = mimetype.startsWith('video/');
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'products',
        resource_type: isVideo ? 'video' : 'image',
        transformation: isVideo ? [] : [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// ── GET /search - ✅ لازم يكون قبل /:id ──
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ products: [] });
    }

    const regex = new RegExp(escapeRegex(q.trim()), 'i');

    const products = await Product.find({
      $or: [
        { name: regex },
        { description: regex },
        { category: regex },
        { brand: regex },
        { discount: regex },
      ]
    })
      .select('name description category brand price oldPrice discount media rating reviewsCount freeShipping freeShippingMin productId')
      .limit(Number(limit))
      .lean();

    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET / - مفتوح للكل ✅ ──────────────────
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;
    const total = await Product.countDocuments();
    const sortOrder = page % 2 === 0 ? 1 : -1;
    const products = await Product.find()
      .sort({ productId: sortOrder })
      .skip(skip)
      .limit(limit);
    res.json({ products, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ── GET /:id - ✅ بعد /search ──────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });
    if (!product) return res.status(404).json({ error: 'المنتج مش موجود' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ── POST - Admin فقط 🔒 ──────────────────
router.post('/', verifyToken, verifyAdmin, upload.array('media', 10), async (req, res) => {
  try {
    const lastProduct = await Product.findOne().sort({ productId: -1 });
    const newProductId = (lastProduct && lastProduct.productId) ? lastProduct.productId + 1 : 10001;

    const mediaPromises = req.files.map(file => uploadToCloudinary(file.buffer, file.mimetype));
    const uploadedFiles = await Promise.all(mediaPromises);

    const media = uploadedFiles.map((result, i) => ({
      type: req.files[i].mimetype.startsWith('video/') ? 'video' : 'image',
      url: result.secure_url,
      publicId: result.public_id,
      alt: req.body.name || 'صورة المنتج'
    }));

    // ✅ حدد الحقول المسموح بيها فقط — منع mass assignment
    const { name, description, price, oldPrice, discount, minQuantity, freeShipping, freeShippingMin, category, brand, stock } = req.body;
    const product = new Product({
      name, description, price, oldPrice, discount, minQuantity,
      freeShipping, freeShippingMin, category, brand, stock,
      productId: newProductId, media
    });
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

router.post('/:id/media', verifyToken, verifyAdmin, upload.array('media', 10), async (req, res) => {
  try {
    const mediaPromises = req.files.map(file => uploadToCloudinary(file.buffer, file.mimetype));
    const uploadedFiles = await Promise.all(mediaPromises);

    const media = uploadedFiles.map((result, i) => ({
      type: req.files[i].mimetype.startsWith('video/') ? 'video' : 'image',
      url: result.secure_url,
      publicId: result.public_id,
      alt: 'صورة المنتج'
    }));

    const product = await Product.findOneAndUpdate(
      { productId: req.params.id },
      { $push: { media: { $each: media } } },
      { new: true }
    );
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ── DELETE - Admin فقط 🔒 ─────────────────
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });
    if (!product) return res.status(404).json({ message: 'المنتج مش موجود' });

    if (product.media && product.media.length > 0) {
      const deletePromises = product.media.map(m =>
        cloudinary.uploader.destroy(m.publicId, {
          resource_type: m.type === 'video' ? 'video' : 'image'
        })
      );
      await Promise.all(deletePromises);
    }

    await Product.deleteOne({ productId: req.params.id });
    res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ── PUT - Admin فقط 🔒 ───────────────────
router.put('/:id', verifyToken, verifyAdmin, upload.array('media', 10), async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });
    if (!product) return res.status(404).json({ message: 'المنتج مش موجود' });

    const deleteIds = req.body.deleteMediaIds ? JSON.parse(req.body.deleteMediaIds) : [];
    if (deleteIds.length > 0) {
      const deletePromises = deleteIds.map(publicId => {
        const mediaItem = product.media.find(m => m.publicId === publicId);
        return cloudinary.uploader.destroy(publicId, {
          resource_type: mediaItem?.type === 'video' ? 'video' : 'image'
        });
      });
      await Promise.all(deletePromises);
    }

    const keepIds = req.body.keepMediaIds ? JSON.parse(req.body.keepMediaIds) : [];
    const keptMedia = product.media.filter(m => keepIds.includes(m.publicId));

    let newMedia = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer, file.mimetype));
      const uploadedFiles = await Promise.all(uploadPromises);
      newMedia = uploadedFiles.map((result, i) => ({
        type: req.files[i].mimetype.startsWith('video/') ? 'video' : 'image',
        url: result.secure_url,
        publicId: result.public_id,
        alt: req.body.name || 'صورة المنتج'
      }));
    }

    const { deleteMediaIds, keepMediaIds, ...updateData } = req.body;
    const updatedProduct = await Product.findOneAndUpdate(
      { productId: req.params.id },
      { ...updateData, media: [...keptMedia, ...newMedia] },
      { new: true }
    );

    res.json({ success: true, product: updatedProduct });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// ✅ لازم يكون فوق /:id
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;
    if (!q || q.trim().length < 1) return res.json({ products: [] });

    const regex = new RegExp(escapeRegex(q.trim()), 'i');
    const products = await Product.find({
      $or: [
        { name: regex },
        { description: regex },
        { category: regex },
        { brand: regex },
        { discount: regex },
      ]
    })
      .select('name description category brand price oldPrice discount media rating reviewsCount freeShipping freeShippingMin productId')
      .limit(Number(limit))
      .lean();

    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;