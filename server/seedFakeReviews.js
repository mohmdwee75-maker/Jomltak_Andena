/**
 * seedFakeReviews.js
 * ==================
 * السكريبت دا بيعمل الآتي:
 *   1. بيجيب كل المنتجات من الداتابيز
 *   2. لكل منتج بيضيف 5 تعليقات وهميه إيجابيه (لو مش موجوده اصلاً)
 *   3. لو المنتج مش متقيّم (rating = 0 أو reviewsCount = 0) بيحدّث التقييم والعدد
 *
 * تشغيل: node seedFakeReviews.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");
const Comment = require("./models/Comment");
const Customer = require("./models/Customer");

// ─── تعليقات وهميه إيجابيه ───────────────────────────────────────────────
const FAKE_REVIEWS = [
  {
    text: "منتج ممتاز جداً، جودة عالية وبيشتغل بكفاءة كبيرة. هشتري تاني بكل تأكيد! 🌟",
    rating: 5,
  },
  {
    text: "التوصيل كان سريع والمنتج وصل سليم 100%. مطابق للوصف وأكتر. شكراً جزيلاً!",
    rating: 5,
  },
  {
    text: "اشتريت المنتج دا وكنت متردد في الأول، بس والله أدهشني. تمام التمام وسعره كويس.",
    rating: 4,
  },
  {
    text: "أفضل منتج اشتريته في الفترة الأخيرة. محد يتردد يشتريه، يستاهل كل قرش.",
    rating: 5,
  },
  {
    text: "خامة ممتازة ومريحة في الاستخدام. بنصح كل حد يشتريه، استثمار حلو جداً ✔️",
    rating: 4,
  },
];

// أسماء وهميه للمستخدمين (هنعمل customers وهميين لو مفيش)
const FAKE_USERS = [
  { F_name: "أحمد", L_name: "محمود", User_name: "ahmed_mahmoud", email: `ahmed_fake_${Date.now()}@fake.com`, Phone: "01012345678" },
  { F_name: "سارة", L_name: "علي", User_name: "sara_ali", email: `sara_fake_${Date.now()}@fake.com`, Phone: "01112345679" },
  { F_name: "محمد", L_name: "حسن", User_name: "mhmd_hasan", email: `mhmd_fake_${Date.now()}@fake.com`, Phone: "01212345680" },
  { F_name: "نور", L_name: "إبراهيم", User_name: "nour_ibrahim", email: `nour_fake_${Date.now()}@fake.com`, Phone: "01512345681" },
];

// ─── Helper: يجيب أو يعمل fake customers ─────────────────────────────────
async function getOrCreateFakeUsers() {
  const users = [];
  for (let i = 0; i < FAKE_USERS.length; i++) {
    const u = FAKE_USERS[i];
    // ابحث عن user بنفس الـ username
    let existing = await Customer.findOne({ User_name: u.User_name });
    if (!existing) {
      // خلي الـ user_ID فريد
      const lastCustomer = await Customer.findOne().sort({ user_ID: -1 });
      const newId = lastCustomer && lastCustomer.user_ID ? lastCustomer.user_ID + 1 : 9000 + i;
      existing = await Customer.create({
        ...u,
        email: `${u.User_name}_${newId}@fake.com`,   // email فريد دايماً
        user_ID: newId,
        Pass: "fake_hashed_pass",
        order_count: 0,
      });
      console.log(`  ✅ تم إنشاء مستخدم وهمي: ${existing.User_name}`);
    } else {
      console.log(`  ℹ️  مستخدم موجود بالفعل: ${existing.User_name}`);
    }
    users.push(existing);
  }
  return users;
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔌 جاري الاتصال بالداتابيز...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ اتصلنا بالداتابيز بنجاح!\n");

  // 1. جيب أو اعمل الـ fake users
  console.log("👥 جاري تجهيز المستخدمين الوهميين...");
  const fakeUsers = await getOrCreateFakeUsers();
  console.log(`\n📦 تم تجهيز ${fakeUsers.length} مستخدم وهمي\n`);

  // 2. جيب كل المنتجات
  const products = await Product.find({});
  console.log(`🛒 عدد المنتجات الكلي: ${products.length}\n`);

  let totalCommentsAdded = 0;
  let totalProductsUpdated = 0;

  for (const product of products) {
    console.log(`📝 بشتغل على المنتج: "${product.name}" (${product._id})`);

    // اتأكد كام تعليق موجود للمنتج دا
    const existingComments = await Comment.countDocuments({ product_id: product._id });
    console.log(`   تعليقات موجودة: ${existingComments}`);

    let commentsAddedForProduct = 0;

    // ضيف التعليقات الوهميه اللي ناقصة بس (مش هيضيف لو 5 موجودين فعلاً)
    if (existingComments < FAKE_REVIEWS.length) {
      const commentsToAdd = FAKE_REVIEWS.length - existingComments;
      const reviewsSlice = FAKE_REVIEWS.slice(existingComments); // الباقيين بس

      for (let i = 0; i < reviewsSlice.length; i++) {
        const review = reviewsSlice[i];
        const fakeUser = fakeUsers[i % fakeUsers.length];

        // اتأكد مش موجود تعليق من نفس اليوزر على نفس المنتج
        const dupCheck = await Comment.findOne({
          product_id: product._id,
          user_id: fakeUser._id,
        });

        if (dupCheck) {
          console.log(`   ⏭️  تعليق من ${fakeUser.User_name} موجود، بتخطاه...`);
          continue;
        }

        await Comment.create({
          product_id: product._id,
          user_id: fakeUser._id,
          text: review.text,
          rating: review.rating,
          is_verified_purchase: true,
          likes: Math.floor(Math.random() * 15) + 1,
        });

        commentsAddedForProduct++;
        console.log(`   ➕ تم إضافة تعليق من "${fakeUser.User_name}" - ${review.rating}⭐`);
      }
      totalCommentsAdded += commentsAddedForProduct;
    } else {
      console.log(`   ✅ المنتج عنده ${existingComments} تعليق بالفعل، مش هضيف أكتر.`);
    }

    // 3. لو المنتج مش متقيّم (rating = 0 أو reviewsCount = 0) → حدّث التقييم
    if (!product.rating || product.rating === 0 || !product.reviewsCount || product.reviewsCount === 0) {
      // احسب متوسط التقييم من التعليقات الموجودة
      const allComments = await Comment.find({ product_id: product._id });
      const totalRatings = allComments.reduce((sum, c) => sum + (c.rating || 0), 0);
      const avgRating = allComments.length > 0
        ? parseFloat((totalRatings / allComments.length).toFixed(1))
        : 4.5; // قيمة افتراضية إيجابية

      await Product.findByIdAndUpdate(product._id, {
        rating: avgRating,
        reviewsCount: allComments.length,
      });

      totalProductsUpdated++;
      console.log(`   🌟 تم تحديث التقييم: ${avgRating} ⭐ (${allComments.length} تقييم)`);
    } else {
      // حتى لو كان متقيّم، حدّث الـ reviewsCount بالعدد الفعلي
      const allComments = await Comment.find({ product_id: product._id });
      if (allComments.length !== product.reviewsCount) {
        const totalRatings = allComments.reduce((sum, c) => sum + (c.rating || 0), 0);
        const avgRating = parseFloat((totalRatings / allComments.length).toFixed(1));
        await Product.findByIdAndUpdate(product._id, {
          rating: avgRating,
          reviewsCount: allComments.length,
        });
        console.log(`   🔄 تم تحديث عدد التقييمات: ${avgRating}⭐ (${allComments.length})`);
      } else {
        console.log(`   ✅ المنتج متقيّم مسبقاً: ${product.rating}⭐ (${product.reviewsCount} تقييم)`);
      }
    }

    console.log(""); // سطر فاضي للفصل
  }

  console.log("═══════════════════════════════════════════");
  console.log(`✅ انتهى السكريبت بنجاح!`);
  console.log(`   📝 تعليقات تمت إضافتها:   ${totalCommentsAdded}`);
  console.log(`   🌟 منتجات تم تقييمها:     ${totalProductsUpdated}`);
  console.log(`   🛒 إجمالي المنتجات:        ${products.length}`);
  console.log("═══════════════════════════════════════════");

  await mongoose.disconnect();
  console.log("🔌 تم قطع الاتصال بالداتابيز.");
}

main().catch((err) => {
  console.error("❌ حدث خطأ:", err);
  mongoose.disconnect();
  process.exit(1);
});
