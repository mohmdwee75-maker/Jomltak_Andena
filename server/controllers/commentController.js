const Comment = require('../models/Comment');
const Product = require('../models/Product');

// ─── جيب تعليقات منتج معين ───────────────────────────────────────────────────
const getComments = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;

    // دور على المنتج الأول عن طريق الـ productId الرقمي
    const product = await Product.findOne({ productId: Number(productId) });
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    const comments = await Comment.find({ product_id: product._id })
      .populate('user_id', 'F_name L_name image')   // جيب اسم وصورة اليوزر بس
      .sort({ createdAt: -1 })                        // الأحدث أولاً
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments({ product_id: product._id });

    // رتّب الشكل اللي الفرونت بيحتاجه
    const formatted = comments.map(c => ({
      id: c._id,
      userId: c.user_id?._id?.toString(),                                                    // ← مهم للمقارنة في الفرونت
      userName: `${c.user_id?.F_name || ''} ${c.user_id?.L_name || ''}`.trim() || 'مجهول',
      image: c.user_id?.image || null,
      date: c.createdAt,
      rating: c.rating,
      text: c.text,
    }));

    res.json({
      comments: formatted,
      total,
      hasMore: skip + limit < total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ في جلب التعليقات' });
  }
};

// ─── ضيف تعليق جديد ──────────────────────────────────────────────────────────
const addComment = async (req, res) => {
  try {
    const { productId } = req.params;
    const { text, rating } = req.body;
    // ✅ user_id من التوكن مش من الـ body — أمان
    const user_id = req.user?.userId;

    if (!user_id) return res.status(401).json({ message: 'غير مصرح' });

    // تحقق من البيانات
    if (!text || !rating) {
      return res.status(400).json({ message: 'text و rating مطلوبين' });
    }

    // دور على المنتج عن طريق الـ productId الرقمي
    const product = await Product.findOne({ productId: Number(productId) });
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    // ضيف التعليق
    const newComment = await Comment.create({
      product_id: product._id,
      user_id,
      text,
      rating,
    });

    // حدّث الـ rating والـ reviewsCount في المنتج
    const allRatings = await Comment.find({ product_id: product._id }, 'rating');
    const avgRating = allRatings.reduce((sum, c) => sum + c.rating, 0) / allRatings.length;

    await Product.findByIdAndUpdate(product._id, {
      rating: parseFloat(avgRating.toFixed(1)),
      reviewsCount: allRatings.length,
    });

    // جيب بيانات اليوزر عشان ترجعها للفرونت فوراً
    const populated = await newComment.populate('user_id', 'F_name L_name image');

    res.status(201).json({
      id: populated._id,
      userId: populated.user_id?._id?.toString(),
      userName: `${populated.user_id?.F_name || ''} ${populated.user_id?.L_name || ''}`.trim(),
      image: populated.user_id?.image || null,
      date: populated.createdAt,
      rating: populated.rating,
      text: populated.text,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ في إضافة التعليق' });
  }
};

// ─── حذف تعليق ────────────────────────────────────────────────────────────────
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    // ✅ user_id من التوكن — لا نثق بـ body
    const user_id = req.user?.userId;
    const role = req.user?.role;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'التعليق غير موجود' });

    // صاحب التعليق أو أدمن يقدر يحذف
    if (comment.user_id.toString() !== user_id && role !== 'admin') {
      return res.status(403).json({ message: 'مش مسموح ليك تحذف التعليق ده' });
    }

    await Comment.findByIdAndDelete(commentId);

    // حدّث الـ rating في المنتج
    const allRatings = await Comment.find({ product_id: comment.product_id }, 'rating');
    const avgRating = allRatings.length
      ? allRatings.reduce((sum, c) => sum + c.rating, 0) / allRatings.length
      : 0;

    await Product.findByIdAndUpdate(comment.product_id, {
      rating: parseFloat(avgRating.toFixed(1)),
      reviewsCount: allRatings.length,
    });

    res.json({ message: 'تم حذف التعليق' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ في حذف التعليق' });
  }
};

// ─── تعديل تعليق ──────────────────────────────────────────────────────────────
const editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, rating } = req.body;
    // ✅ user_id من التوكن — لا نثق بـ body
    const user_id = req.user?.userId;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'التعليق غير موجود' });

    if (comment.user_id.toString() !== user_id) {
      return res.status(403).json({ message: 'مش مسموح ليك تعدل التعليق ده' });
    }

    comment.text = text || comment.text;
    comment.rating = rating || comment.rating;
    await comment.save();

    // حدّث الـ avg rating في المنتج
    const allRatings = await Comment.find({ product_id: comment.product_id }, 'rating');
    const avgRating = allRatings.reduce((sum, c) => sum + c.rating, 0) / allRatings.length;
    await Product.findByIdAndUpdate(comment.product_id, {
      rating: parseFloat(avgRating.toFixed(1)),
    });

    res.json({ message: 'تم تعديل التعليق', text: comment.text, rating: comment.rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ في تعديل التعليق' });
  }
};
// جيب كل تعليقات يوزر معين
const getCommentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const comments = await Comment.find({ user_id: userId })
      .populate('product_id', 'name media price')  // جيب اسم المنتج وصورته
      .sort({ createdAt: -1 });

    const formatted = comments.map(c => ({
      id: c._id,
      _id: c._id,
      text: c.text,
      rating: c.rating,
      date: c.createdAt,
      createdAt: c.createdAt,
      productId: c.product_id?._id,
      product_id: c.product_id?._id,
      productName: c.product_id?.name,
      productImage: c.product_id?.media?.[0]?.url || null,
    }));

    res.json({ comments: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports = { getComments, addComment, deleteComment, editComment, getCommentsByUser };