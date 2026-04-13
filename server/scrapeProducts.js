/**
 * 🎣 سكريبت إضافة منتجات أدوات صيد
 *
 * الاستخدام: node scrapeProducts.js
 *
 * المصادر:
 *   1. Jumia Egypt — يبحث في الموقع مباشرةً
 *   2. قاعدة بيانات محلية — 40+ منتج مع صور حقيقية
 */

require('dotenv').config();
const readline = require('readline');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Product = require('./models/Product');

// ── helpers ──────────────────────────────────────────────────────────────────
function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, a => { rl.close(); resolve(a.trim()); }));
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function calcDiscount(price, oldPrice) {
  const d = Math.round(((oldPrice - price) / oldPrice) * 100);
  return d > 0 ? `${d}%` : '';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── HTTP headers للـ scraping ────────────────────────────────────────────────
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept-Language': 'ar,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

// ── Unsplash image sets per category ─────────────────────────────────────────
const IMAGES = {
  rods: [
    'https://images.unsplash.com/photo-1463612910807-83d57c3c7dc9?w=800',
    'https://images.unsplash.com/photo-1614738245901-8e78e5059e5b?w=800',
    'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800',
    'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800',
    'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800',
  ],
  reels: [
    'https://images.unsplash.com/photo-1563729784474-d77dca9f863e?w=800',
    'https://images.unsplash.com/photo-1589288216987-d71f0f56bfe3?w=800',
    'https://images.unsplash.com/photo-1512152272829-e3139592d56f?w=800',
    'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800',
    'https://images.unsplash.com/photo-1509984893052-1a0c2b78921f?w=800',
  ],
  lures: [
    'https://images.unsplash.com/photo-1526640987-3e7d83e3de33?w=800',
    'https://images.unsplash.com/photo-1559209172-0ff8f6d49ff7?w=800',
    'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
    'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=800',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  ],
  gear: [
    'https://images.unsplash.com/photo-1537511446984-935f663eb1f4?w=800',
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    'https://images.unsplash.com/photo-1567306301408-9b74779a11af?w=800',
    'https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=800',
  ],
};

// ── قاعدة البيانات المحلية — 40 منتج ─────────────────────────────────────────
const LOCAL_DB = [
  // ─── طيارات صيد ─────────────────────────────
  {
    name: 'طيارة صيد كربون احترافية 2.7م - Shimano',
    description: 'طيارة صيد مصنوعة من ألياف الكربون عالية الجودة توفر متانة استثنائية مع خفة الوزن. طولها 2.7 متر مما يجعلها مثالية لصيد الأسماك في البحر المتوسط والنيل الكبير. تحتوي على مقبض فلين طبيعي مريح ومرشدات من الألومنيوم المعالج لمنع تآكل الخيط.',
    category: 'طيارات صيد', brand: 'Shimano',
    price: 750, markup: 0.35, rating: 4.7, reviewsCount: 312, stock: 25, imgKey: 'rods',
  },
  {
    name: 'طيارة صيد خفيفة للمبتدئين 1.8م - Daiwa',
    description: 'طيارة صيد مثالية للمبتدئين، خفيفة وسهلة الاستخدام مصنوعة من الألياف الزجاجية عالية الجودة. طولها 1.8 متر مناسبة للصيد في الترع والبحيرات. تأتي مع حلقات إرشاد حديثة وجهاز استرداد سلس.',
    category: 'طيارات صيد', brand: 'Daiwa',
    price: 350, markup: 0.28, rating: 4.2, reviewsCount: 178, stock: 40, imgKey: 'rods',
  },
  {
    name: 'طيارة صيد بحري 3.6م - Abu Garcia',
    description: 'طيارة صيد قوية مصممة خصيصاً للصيد البحري العميق. طولها 3.6 متر تتحمل أوزان تصل إلى 50 كجم. مصنوعة من مواد مركبة متطورة توفر المرونة اللازمة مع القوة الكافية للإمساك بأسماك التونة والسوبيطة الكبيرة.',
    category: 'طيارات صيد', brand: 'Abu Garcia',
    price: 1200, markup: 0.32, rating: 4.8, reviewsCount: 89, stock: 15, imgKey: 'rods',
  },
  {
    name: 'طيارة صيد تليسكوبية 4.5م - Penn',
    description: 'طيارة تليسكوبية من Penn تطوى لتصبح طولها 60 سم فقط، مثالية للسفر والرحلات. تمتد إلى 4.5 متر عند الاستخدام. مغلفة بطبقة أوكسيد الكروم لمقاومة الصدأ.',
    category: 'طيارات صيد', brand: 'Penn',
    price: 890, markup: 0.25, rating: 4.5, reviewsCount: 204, stock: 20, imgKey: 'rods',
  },
  {
    name: 'طيارة صيد سبينينج 2.1م - Ugly Stik',
    description: 'طيارة سبينينج الشهيرة من Ugly Stik معروفة بمتانتها الأسطورية. تجمع بين ألياف الكربون والزجاج مما يجعلها شبه غير قابلة للكسر. مناسبة لصيد الفرخ والبلطي.',
    category: 'طيارات صيد', brand: 'Ugly Stik',
    price: 620, markup: 0.22, rating: 4.6, reviewsCount: 445, stock: 35, imgKey: 'rods',
  },

  // ─── بكرات صيد ─────────────────────────────
  {
    name: 'بكرة صيد سبينينج 4000 سلسة - Shimano',
    description: 'بكرة سبينينج احترافية من Shimano ذات نظام تروس فائق الدقة تعمل بسلاسة تامة. حجم 4000 مناسب لخيط نايلون 0.30 أو خيط PE. تحتوي على 6+1 كرسي تسجيل وذراع قابل للتحكم في شد الخيط.',
    category: 'بكرات صيد', brand: 'Shimano',
    price: 950, markup: 0.38, rating: 4.8, reviewsCount: 521, stock: 18, imgKey: 'reels',
  },
  {
    name: 'بكرة صيد بيت كاستينج 200 - Daiwa',
    description: 'بكرة بيت كاستينج المتطورة من Daiwa لصيد الأسماك الكبيرة. تتميز بنظام تحكم في الحثالة المغناطيسي وسرعات نقل متعددة. مناسبة لصيد الوقار والبياض.',
    category: 'بكرات صيد', brand: 'Daiwa',
    price: 1450, markup: 0.30, rating: 4.6, reviewsCount: 134, stock: 12, imgKey: 'reels',
  },
  {
    name: 'بكرة صيد بلي بوي 3000 - Abu Garcia',
    description: 'بكرة Abu Garcia سهلة الاستخدام لصيد الأسماك في البحيرات والترع. نظامها الأوتوماتيكي للإطلاق يجعلها مثالية للمبتدئين. تأتي مع خيط مسبق الملء.',
    category: 'بكرات صيد', brand: 'Abu Garcia',
    price: 680, markup: 0.27, rating: 4.3, reviewsCount: 267, stock: 30, imgKey: 'reels',
  },
  {
    name: 'بكرة صيد بحري كبيرة 8000 - Penn',
    description: 'بكرة بحرية قوية من Penn مصممة لصيد الأسماك الكبيرة في أعماق البحار. تحمل خيطاً بطول 300 متر. نظام فرملة خاص بالمياه المالحة يمنع التآكل.',
    category: 'بكرات صيد', brand: 'Penn',
    price: 2100, markup: 0.25, rating: 4.9, reviewsCount: 78, stock: 8, imgKey: 'reels',
  },
  {
    name: 'بكرة صيد فلاي فيشينج 5/6 - Okuma',
    description: 'بكرة فلاي فيشينج بآلية سبع كرات تسجيل لأداء سلس استثنائي. مصنوعة من الألومنيوم المشغول بالآلة مع تشطيب أنودي للحماية. مثالية لصيد التروتة.',
    category: 'بكرات صيد', brand: 'Okuma',
    price: 780, markup: 0.33, rating: 4.4, reviewsCount: 156, stock: 22, imgKey: 'reels',
  },

  // ─── طعوم وإبر ─────────────────────────────
  {
    name: 'مجموعة طعوم سيليكون متنوعة 20 قطعة',
    description: 'مجموعة شاملة من طعوم السيليكون الناعمة بأشكال وألوان متنوعة تحاكي الديدان والسمكة الصغيرة. مصنوعة من السيليكون الرائحة التي تجذب الأسماك. مناسبة لصيد البياض والفرخ.',
    category: 'طعوم وإبر', brand: 'Generic',
    price: 85, markup: 0.55, rating: 4.1, reviewsCount: 832, stock: 100, imgKey: 'lures',
  },
  {
    name: 'طعم سبينر دوار لمياه العذبة - Mepps',
    description: 'طعم سبينر كلاسيكي من Mepps الشهيرة يدور في الماء محدثاً اهتزازات تجذب أسماك البياض والبلطي. مصنوع من النحاس المطلي بالذهب. وزن 7 جرام مناسب للصيد في التيارات.',
    category: 'طعوم وإبر', brand: 'Mepps',
    price: 120, markup: 0.45, rating: 4.5, reviewsCount: 389, stock: 60, imgKey: 'lures',
  },
  {
    name: 'طعم كرنك بلاستيك صلب 9 سم - Rapala',
    description: 'طعم كرنك شهير من Rapala بعمق غوص 1-2 متر. يبلغ طوله 9 سم ووزنه 11 جرام. يحمل شنكلين قويين من الفولاذ. يقلد حركة السمكة المصابة بشكل مميز.',
    category: 'طعوم وإبر', brand: 'Rapala',
    price: 195, markup: 0.40, rating: 4.6, reviewsCount: 211, stock: 45, imgKey: 'lures',
  },
  {
    name: 'طعم جيق السقيطة 40 جرام',
    description: 'طعم جيق معدني ثقيل 40 جرام لصيد الأسماك البحرية في الأعماق. سطحه اللامع يعكس الضوء محاكياً السمكة الصغيرة. مشبك قوي من الفولاذ اللامبدأ.',
    category: 'طعوم وإبر', brand: 'Owner',
    price: 65, markup: 0.60, rating: 4.3, reviewsCount: 567, stock: 80, imgKey: 'lures',
  },
  {
    name: 'طعم بوبر طافي 11 سم - Strike King',
    description: 'طعم بوبر طافي من Strike King يصنع ضرباً وجاذبية على سطح الماء. طوله 11 سم ووزنه 14 جرام. مثالي لصيد السمك الصائد على السطح في الفجر والغروب.',
    category: 'طعوم وإبر', brand: 'Strike King',
    price: 145, markup: 0.42, rating: 4.4, reviewsCount: 178, stock: 55, imgKey: 'lures',
  },

  // ─── خيوط صيد ─────────────────────────────
  {
    name: 'خيط صيد نايلون 0.30 - 300م - Sunset',
    description: 'خيط نايلون شفاف عالي الجودة بقطر 0.30 مم على بكرة 300 متر. قوة شد تصل إلى 8.5 كجم. مقاوم للأشعة فوق البنفسجية ويحافظ على مرونته في المياه الباردة.',
    category: 'خيوط صيد', brand: 'Sunset',
    price: 75, markup: 0.40, rating: 4.3, reviewsCount: 623, stock: 120, imgKey: 'gear',
  },
  {
    name: 'خيط صيد PE مضفر 4X - 150م - Power Pro',
    description: 'خيط Power Pro المضفر 4 محاور لقوة شد استثنائية. رفيع بقطر يعادل 0.20مم لكن بقوة شد 20 كجم. مناسب للبكرات الإلكترونية وصيد الأسماك الكبيرة.',
    category: 'خيوط صيد', brand: 'Power Pro',
    price: 185, markup: 0.35, rating: 4.7, reviewsCount: 441, stock: 65, imgKey: 'gear',
  },
  {
    name: 'خيط صيد فلوروكربون 0.40 - 50م - Seaguar',
    description: 'خيط فلوروكربون Seaguar عالي الجودة شبه شفاف تحت الماء مما يجعله مثالياً كخيط قائد. مقاوم للغاز والكيميائيات ولا يمتص الماء.',
    category: 'خيوط صيد', brand: 'Seaguar',
    price: 130, markup: 0.38, rating: 4.5, reviewsCount: 289, stock: 50, imgKey: 'gear',
  },
  {
    name: 'خيط صيد ملون 6 ألوان - 300م - Spiderwire',
    description: 'خيط Spiderwire Stealth Braid المضفر بـ 8 محاور مع مقياس عمق بـ 6 ألوان كل 10 متر. ممتاز لصيد الجمبري العميق لمعرفة عمق الطعم بدقة.',
    category: 'خيوط صيد', brand: 'Spiderwire',
    price: 220, markup: 0.30, rating: 4.6, reviewsCount: 198, stock: 40, imgKey: 'gear',
  },

  // ─── مستلزمات وإكسسوارات ─────────────────────
  {
    name: 'صندوق طُعم 3 طوابق صيد متعدد الأقسام',
    description: 'صندوق تنظيم الطعم الاحترافي ذو 3 طوابق قابلة للفصل. يحتوي على 24 قسماً بأحجام متنوعة. مصنوع من البلاستيك الشفاف المقاوم للصدأ والرطوبة. ترباس مزدوج يمنع فتحه عن طريق الخطأ.',
    category: 'مستلزمات صيد', brand: 'Plano',
    price: 145, markup: 0.48, rating: 4.4, reviewsCount: 534, stock: 60, imgKey: 'gear',
  },
  {
    name: 'إبرة صيد ثلاثية شنكل قوي 50 حبة - Owner',
    description: 'علبة تحتوي على 50 إبرة ثلاثية التعليق من Owner اليابانية. مصنوعة من الفولاذ الكربوني المقاوم للصدأ مع حافة حادة للاختراق الفوري. متوفرة بحجم 4 مناسب للطعوم المتوسطة.',
    category: 'مستلزمات صيد', brand: 'Owner',
    price: 55, markup: 0.70, rating: 4.7, reviewsCount: 892, stock: 200, imgKey: 'gear',
  },
  {
    name: 'طُعم ديدان صناعي رائحة طبيعية 20 قطعة',
    description: 'ديدان صناعية مصنوعة من السيليكون المعطر بصيغة تحاكي رائحة الدود الحقيقي. طولها 10 سم وتأتي بألوان متعددة. تجذب البياض والبلطي والفرخ بشكل فعال.',
    category: 'مستلزمات صيد', brand: 'Berkley',
    price: 70, markup: 0.55, rating: 4.2, reviewsCount: 678, stock: 90, imgKey: 'lures',
  },
  {
    name: 'ميزان رقمي للصيد 50 كجم مع قياس',
    description: 'ميزان رقمي دقيق للصيد يقيس حتى 50 كجم بدقة 10 جرام. مزود بمقياس طول يصل إلى 1 متر. شاشة LCD كبيرة واضحة في الشمس. مقاوم للماء.',
    category: 'مستلزمات صيد', brand: 'Berkley',
    price: 165, markup: 0.40, rating: 4.4, reviewsCount: 312, stock: 35, imgKey: 'gear',
  },
  {
    name: 'كلابس وربطات صيد ستانلس 100 قطعة',
    description: 'علبة متنوعة تحتوي على 100 قطعة من الكلابس والربطات والحلقات المفتوحة من الفولاذ اللاصدئ. حجم 10 وزن تحمل 50 كجم. ضرورية لتجميع التزييل البحري والنهري.',
    category: 'مستلزمات صيد', brand: 'Generic',
    price: 45, markup: 0.75, rating: 4.5, reviewsCount: 1203, stock: 300, imgKey: 'gear',
  },
  {
    name: 'تمساح إمساك أسماك بلاستيك 35 سم - Rapala',
    description: 'تمساح Rapala لحمل الأسماك وسحبها بأمان بدون الإمساك باليد. طوله 35 سم بمقياس ملون للقياس الفوري. قبضته المطاطة تمنع الانزلاق. مناسب لأسماك حتى 5 كجم.',
    category: 'مستلزمات صيد', brand: 'Rapala',
    price: 320, markup: 0.35, rating: 4.6, reviewsCount: 145, stock: 28, imgKey: 'gear',
  },
  {
    name: 'لانتيرن صيد ليلي LED مقاوم للماء',
    description: 'لانتيرن Luxpro LED للصيد الليلي بقوة 500 لومن. مقاوم للماء والصدم. بطاريات AA تدوم 12 ساعة. خطاف معلق ومغناطيس قوي للتثبيت على الزورق.',
    category: 'مستلزمات صيد', brand: 'LuxPro',
    price: 245, markup: 0.42, rating: 4.3, reviewsCount: 267, stock: 45, imgKey: 'gear',
  },
  {
    name: 'نظارة صيد مستقطبة UV400 - Oakley',
    description: 'نظارة صيد مستقطبة عالية الجودة تلغي الوهج المنعكس من سطح الماء مما يمكنك من رؤية الأسماك تحت الماء. عدسات UV400 تحمي عيونك. إطار مرن مريح للاستخدام الطويل.',
    category: 'مستلزمات صيد', brand: 'Oakley',
    price: 550, markup: 0.30, rating: 4.7, reviewsCount: 198, stock: 20, imgKey: 'gear',
  },

  // ─── قفازات وملابس صيد ─────────────────────
  {
    name: 'سترة صيد متعددة الجيوب - Columbia',
    description: 'سترة صيد احترافية من Columbia بـ 12 جيب بأحجام مختلفة. قماش رياح سريع الجفاف مع فتحات تهوية على الظهر. حماية شمسية UPF 50+. قابلة للطي والتخزين في جيبها الخاص.',
    category: 'ملابس صيد', brand: 'Columbia',
    price: 850, markup: 0.32, rating: 4.5, reviewsCount: 233, stock: 18, imgKey: 'gear',
  },
  {
    name: 'بوت صيد مطاط مضاد للانزلاق - Shimano',
    description: 'بوت صيد من المطاط الطبيعي السميك بنعل مضاد للانزلاق مناسب للصيد في الترع والبحيرات. ارتفاع 40 سم يمنع دخول الماء. مبطن من الداخل لراحة القدم.',
    category: 'ملابس صيد', brand: 'Shimano',
    price: 420, markup: 0.37, rating: 4.4, reviewsCount: 189, stock: 25, imgKey: 'gear',
  },
  {
    name: 'قبعة صيد مقاومة للشمس UV50+',
    description: 'قبعة صيد احترافية بماصة طويلة 20 سم تحمي الوجه والعنق. قماش سريع الجفاف مع شبك تهوية علوي. حزام ذقن قابل للضبط. مثالية للصيد في الصحراء.',
    category: 'ملابس صيد', brand: 'Columbia',
    price: 195, markup: 0.45, rating: 4.3, reviewsCount: 412, stock: 60, imgKey: 'gear',
  },

  // ─── إضافية متنوعة ──────────────────────────
  {
    name: 'شنكل دبوس نهائي ستانلس 40 كجم - 10 قطع',
    description: 'شنكل دبوس من الفولاذ المقاوم للصدأ بتحمل 40 كجم. سهل التركيب والفك دون أدوات. مثالي للصيد البحري وربط التزييل الثقيل.',
    category: 'مستلزمات صيد', brand: 'Mustad',
    price: 35, markup: 0.80, rating: 4.6, reviewsCount: 1567, stock: 500, imgKey: 'gear',
  },
  {
    name: 'طُعم شرانق سيليكون توائم 12 سم - 5 قطع',
    description: 'طعم سيليكون ناعم بذيل مزدوج يقلد حركة الجمبري في الماء. طوله 12 سم مناسب لصيد الوقار والبياض الكبير. يأتي في 5 ألوان جاذبة.',
    category: 'طعوم وإبر', brand: 'Berkley',
    price: 95, markup: 0.50, rating: 4.4, reviewsCount: 423, stock: 75, imgKey: 'lures',
  },
  {
    name: 'مجساس صيد ذكي إيكو سونار بلوتوث',
    description: 'مجساس صوتي ذكي يتصل بهاتفك عبر البلوتوث ويعرض عمق الماء وموقع الأسماك ودرجة الحرارة. مقاوم للماء. شحن USB. تطبيق مجاني للأندرويد والآيفون.',
    category: 'مستلزمات صيد', brand: 'Deeper',
    price: 1850, markup: 0.22, rating: 4.7, reviewsCount: 167, stock: 10, imgKey: 'gear',
  },
  {
    name: 'مجداف قوارب صيد ألومنيوم خفيف 1.8م',
    description: 'مجداف من الألومنيوم الخفيف ذو مقبض إسفنجي مريح. طوله 1.8 متر قابل للطي للتخزين. مثالي لقوارب المطاط والزوارق الصغيرة.',
    category: 'مستلزمات صيد', brand: 'Generic',
    price: 185, markup: 0.40, rating: 4.1, reviewsCount: 98, stock: 30, imgKey: 'gear',
  },
  {
    name: 'مصيدة جمبري بلاستيك قابلة للطي 40 سم',
    description: 'مصيدة جمبري من البلاستيك المتين بفتحات إدخال ذكية تمنع الخروج. قطر 40 سم، تُطوى لـ 5 سم للتخزين. مثالية لصيد الجمبري في الترع والبحيرات بالطعم الحي.',
    category: 'مستلزمات صيد', brand: 'Generic',
    price: 55, markup: 0.65, rating: 4.0, reviewsCount: 743, stock: 150, imgKey: 'gear',
  },
  {
    name: 'طيارة صيد كربون فلاي 9 قدم - Sage',
    description: 'طيارة فلاي فيشينج من Sage مصنوعة من ألياف الكربون الخفيف فائق الجودة. طولها 9 قدم (2.74م) بقوة الرمي 5-6. دقة رمي استثنائية لصيد التروتة والسالمون.',
    category: 'طيارات صيد', brand: 'Sage',
    price: 2800, markup: 0.20, rating: 4.9, reviewsCount: 45, stock: 5, imgKey: 'rods',
  },
  {
    name: 'بكرة تروللينج كهربائية 500م - Shimano',
    description: 'بكرة تروللينج كهربائية قادرة على سحب خط 500 متر تلقائياً. موتور قوي لصيد الأعماق. ذاكرة برمجية لضبط عمق الصيد مسبقاً. تعمل على 12 فولت.',
    category: 'بكرات صيد', brand: 'Shimano',
    price: 3500, markup: 0.18, rating: 4.8, reviewsCount: 32, stock: 6, imgKey: 'reels',
  },
  {
    name: 'حقيبة صيد مقاومة للماء 30 لتر',
    description: 'حقيبة صيد احترافية من قماش 600D المقاوم للماء بسعة 30 لتر. تحتوي على قسمين رئيسيين وجيوب جانبية للطعم والإكسسوارات. حزام كتف مبطن للراحة.',
    category: 'مستلزمات صيد', brand: 'Generic',
    price: 280, markup: 0.44, rating: 4.4, reviewsCount: 356, stock: 40, imgKey: 'gear',
  },
];

// ── scrape Jumia Egypt ────────────────────────────────────────────────────────
async function scrapeJumia(count) {
  console.log('\n🔍 جاري الاتصال بـ Jumia Egypt...');
  try {
    const res = await axios.get(
      'https://www.jumia.com.eg/sporting-goods-fishing/?page=1',
      { headers: HEADERS, timeout: 12000 }
    );
    const $ = cheerio.load(res.data);
    const items = [];

    $('article.prd').each((_, el) => {
      if (items.length >= count * 2) return false;  // جيب ضعف العدد للاختيار منهم
      const name = $(el).find('.name').text().trim();
      const priceStr = $(el).find('.prc').text().replace(/[^\d.]/g, '');
      const oldStr = $(el).find('.old').text().replace(/[^\d.]/g, '');
      const img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
      const href = $(el).find('a.core').attr('href') || '';

      if (!name || !priceStr) return;
      items.push({
        name,
        price: parseFloat(priceStr) || 100,
        oldPrice: oldStr ? parseFloat(oldStr) : null,
        img: img.startsWith('http') ? img : `https://www.jumia.com.eg${img}`,
        href: href.startsWith('http') ? href : `https://www.jumia.com.eg${href}`,
      });
    });

    if (items.length === 0) { console.log('⚠️  Jumia لم يُرجع منتجات.'); return null; }

    console.log(`✅ وجد ${items.length} منتج على Jumia — جاري جلب تفاصيل...`);

    const detailed = [];
    for (const item of items.slice(0, count)) {
      try {
        await new Promise(r => setTimeout(r, 600));   //礼貌 – لا نرهق السيرفر
        const det = await axios.get(item.href, { headers: HEADERS, timeout: 10000 });
        const $d = cheerio.load(det.data);

        const desc = $d('-description, .markup, [data-qa="product-description"]').text().trim()
          || 'منتج صيد عالي الجودة متاح عبر جملتك عندنا.';

        const imgs = [item.img];
        $d('img[data-index]').each((_, i) => {
          const src = $d(i).attr('data-src') || $d(i).attr('src') || '';
          if (src.startsWith('http') && !imgs.includes(src)) imgs.push(src);
        });

        detailed.push({ ...item, description: desc, images: imgs });
      } catch {
        detailed.push({ ...item, description: 'منتج صيد متميز.', images: [item.img] });
      }
    }
    return detailed;
  } catch (err) {
    console.log(`⚠️  فشل الاتصال بـ Jumia: ${err.message}`);
    return null;
  }
}

// ── بناء منتجات من قاعدة البيانات المحلية ───────────────────────────────────
function buildFromLocal(count) {
  const picked = shuffle(LOCAL_DB).slice(0, count);
  return picked.map(p => {
    const basePrice = p.price;
    const oldPrice = Math.round(basePrice * (1 + p.markup));
    const imgs = shuffle(IMAGES[p.imgKey]).slice(0, rand(2, 4));
    return {
      name: p.name,
      description: p.description,
      category: p.category,
      brand: p.brand,
      price: basePrice,
      oldPrice: oldPrice,
      discount: calcDiscount(basePrice, oldPrice),
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      stock: p.stock,
      minQuantity: 1,
      freeShipping: rand(0, 1) === 1,
      images: imgs,
    };
  });
}

// ── تحويل منتجات Jumia لصيغة DB ──────────────────────────────────────────────
function formatJumia(items) {
  return items.map(item => {
    const price = item.price;
    const oldPrice = item.oldPrice || Math.round(price * (1 + rand(15, 40) / 100));
    return {
      name: item.name,
      description: item.description || 'منتج صيد متميز من Jumia Egypt.',
      category: 'أدوات صيد',
      brand: 'متنوع',
      price,
      oldPrice,
      discount: calcDiscount(price, oldPrice),
      rating: parseFloat((rand(38, 50) / 10).toFixed(1)),
      reviewsCount: rand(20, 500),
      stock: rand(10, 100),
      minQuantity: 1,
      freeShipping: rand(0, 1) === 1,
      images: item.images?.length ? item.images : [item.img],
    };
  });
}

// ── حفظ في MongoDB ────────────────────────────────────────────────────────────
async function saveProducts(products) {
  const last = await Product.findOne().sort({ productId: -1 });
  let nextId = (last?.productId || 10000) + 1;

  let saved = 0, skipped = 0;
  for (const p of products) {
    const exists = await Product.findOne({ name: p.name });
    if (exists) { skipped++; continue; }

    const media = p.images.map((url, i) => ({
      type: 'image',
      url,
      publicId: '',
      alt: `${p.name} - صورة ${i + 1}`,
    }));

    await new Product({
      productId: nextId++,
      name: p.name,
      description: p.description,
      category: p.category,
      brand: p.brand,
      price: p.price,
      oldPrice: p.oldPrice,
      discount: p.discount || calcDiscount(p.price, p.oldPrice),
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      stock: p.stock,
      minQuantity: p.minQuantity || 1,
      freeShipping: p.freeShipping || false,
      media,
    }).save();

    saved++;
    console.log(`  ✅ [${saved}] ${p.name.substring(0, 50)}`);
  }
  return { saved, skipped };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  🎣  سكريبت إضافة منتجات أدوات صيد  🎣   ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const countStr = await ask('📦 كام منتج عاوز تضيف؟ (1-40)  ');
  const count = Math.min(Math.max(parseInt(countStr) || 5, 1), 40);

  console.log(`\n📌 المصدر:`);
  console.log('   1. Jumia Egypt — يبحث من النت مباشرة');
  console.log('   2. قاعدة البيانات المحلية — 40 منتج صيد جاهز\n');
  const src = await ask('اختارك (1 أو 2):  ');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n🔗 اتصل بـ MongoDB ✅\n');

  let products = [];

  if (src.trim() === '1') {
    const scraped = await scrapeJumia(count);
    if (scraped?.length) {
      products = formatJumia(scraped);
      console.log(`\n📦 جاهز لإضافة ${products.length} منتج من Jumia\n`);
    } else {
      console.log('\n🔄 استخدام قاعدة البيانات المحلية بدلاً من ذلك...\n');
      products = buildFromLocal(count);
    }
  } else {
    products = buildFromLocal(count);
    console.log(`\n📦 جاهز لإضافة ${products.length} منتج من القاعدة المحلية\n`);
  }

  const confirm = await ask(`⚠️  هتضيف ${products.length} منتج في الداتابيز. موافق؟ (y/n)  `);
  if (!confirm.toLowerCase().startsWith('y')) {
    console.log('❌ تم الإلغاء.\n');
    process.exit(0);
  }

  console.log('\n💾 جاري الحفظ في MongoDB...\n');
  const { saved, skipped } = await saveProducts(products);

  console.log(`\n${'─'.repeat(44)}`);
  console.log(`✅ تم حفظ   : ${saved}  منتج`);
  if (skipped) console.log(`⏭️  تم تخطي  : ${skipped} منتج (موجود بالفعل)`);
  console.log(`${'─'.repeat(44)}\n`);

  mongoose.connection.close();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ خطأ:', err.message);
  mongoose.connection.close();
  process.exit(1);
});
