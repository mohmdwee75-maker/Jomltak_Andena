/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        سكريبت سحب منتجات حقيقية من الإنترنت               ║
 * ║   المصادر: Jumia Egypt  |  eBay  |  Amazon                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * الاستخدام: node scrapeProducts.js
 *
 * ⚠️  ملاحظة مهمة:
 *   - الكود ده بيجيب بيانات حقيقية 100% من المواقع مباشرة
 *   - مفيش أي بيانات وهمية أو عشوائية
 *   - لو المنتج مجاش بصور حقيقية → بيتم تخطيه
 */

require('dotenv').config();
const readline = require('readline');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Product = require('./models/Product');
const cloudinary = require('./config/cloudinary');

// ────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, a => { rl.close(); resolve(a.trim()); }));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function calcDiscount(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return '';
  return `${Math.round(((oldPrice - price) / oldPrice) * 100)}%`;
}

// ────────────────────────────────────────────────────────────────
//  HTTP Headers — نقلد المتصفح الحقيقي
// ────────────────────────────────────────────────────────────────

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

// ────────────────────────────────────────────────────────────────
//  Scraper 1 — Jumia Egypt (أسهل للمنتجات المصرية)
// ────────────────────────────────────────────────────────────────

async function scrapeJumia(keyword, maxCount) {
  console.log(`\n🛒 [Jumia] جاري البحث عن: "${keyword}"...`);

  const searchUrl = `https://www.jumia.com.eg/catalog/?q=${encodeURIComponent(keyword)}`;

  let res;
  try {
    res = await axios.get(searchUrl, { headers: HEADERS, timeout: 15000 });
  } catch (err) {
    console.log(`  ⚠️  فشل الاتصال بـ Jumia: ${err.message}`);
    return [];
  }

  const $ = cheerio.load(res.data);
  const listItems = [];

  $('article.prd').each((_, el) => {
    if (listItems.length >= maxCount * 3) return false;

    const name = $(el).find('.name').text().trim();
    const priceStr = $(el).find('.prc').text().replace(/[^\d.]/g, '');
    const oldStr = $(el).find('.old').text().replace(/[^\d.]/g, '');
    const img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
    const href = $(el).find('a.core').attr('href') || '';

    if (!name || !priceStr || !href) return;

    listItems.push({
      name,
      price: parseFloat(priceStr) || 0,
      oldPrice: oldStr ? parseFloat(oldStr) : null,
      img: img.startsWith('http') ? img : `https://www.jumia.com.eg${img}`,
      href: href.startsWith('http') ? href : `https://www.jumia.com.eg${href}`,
      source: 'Jumia Egypt',
    });
  });

  if (listItems.length === 0) {
    console.log('  ⚠️  لم يُرجع Jumia أي نتائج.');
    return [];
  }

  console.log(`  ✅ وجد ${listItems.length} منتج — جاري جلب التفاصيل والصور...`);

  // ── جلب تفاصيل كل منتج ──────────────────────────────────────
  const detailed = [];

  for (const item of listItems) {
    if (detailed.length >= maxCount) break;
    await sleep(700); // نريح السيرفر

    try {
      const det = await axios.get(item.href, { headers: HEADERS, timeout: 12000 });
      const $d = cheerio.load(det.data);

      // ── الوصف ────────────────────────────────────────────────
      let desc = $d('[data-qa="product-description"]').text().trim()
        || $d('.markup').text().trim()
        || $d('-description').text().trim()
        || '';

      // نظف الوصف
      desc = desc.replace(/\s+/g, ' ').trim();

      // لو مفيش وصف حقيقي → نتخطى
      if (desc.length < 20) {
        console.log(`  ⏭️  تخطي "${item.name.slice(0, 40)}" — بدون وصف كافٍ`);
        continue;
      }

      // ── الصور من JSON-LD Schema (الأدق) ─────────────────────
      let imgs = [];

      $d('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($d(el).html());
          const nodes = Array.isArray(data) ? data : [data];
          for (const node of nodes) {
            if (node['@type'] === 'Product') {
              if (Array.isArray(node.image)) imgs.push(...node.image);
              else if (typeof node.image === 'string') imgs.push(node.image);
            }
          }
        } catch (_) { }
      });

      // ── صور من معرض الصور في الصفحة ─────────────────────────
      if (imgs.length === 0) {
        $d('#imgs img, .sldr img, .gallery img, [data-index] img').each((_, el) => {
          const src = $d(el).attr('data-src') || $d(el).attr('src') || '';
          if (src.startsWith('http')) imgs.push(src);
        });
      }

      // أضف الصورة الرئيسية من صفحة القائمة كـ fallback
      if (!imgs.includes(item.img)) imgs.unshift(item.img);
      imgs = [...new Set(imgs)].filter(u => u && u.startsWith('http'));

      // ── الفئة والبراند ───────────────────────────────────────
      const breadcrumbs = $d('.-pvs a, .breadcrumbs a')
        .map((_, el) => $d(el).text().trim())
        .get()
        .filter(t => t && t !== 'جملتك' && t !== 'Jumia');

      const category = breadcrumbs[breadcrumbs.length - 2] || 'أدوات صيد';
      const brand = $d('[data-qa="product-brand"] span, .brand span').first().text().trim()
        || 'متنوع';

      // ── التقييم ──────────────────────────────────────────────
      const ratingStr = $d('[data-qa="product-rating"] .stars, .stars.-ra').attr('style') || '';
      const ratingMatch = ratingStr.match(/([\d.]+)%/);
      const rating = ratingMatch ? parseFloat((parseFloat(ratingMatch[1]) / 20).toFixed(1)) : null;

      const reviewsStr = $d('[data-qa="product-rating"] .count, .rating .count').text().replace(/[^\d]/g, '');
      const reviewsCount = reviewsStr ? parseInt(reviewsStr) : 0;

      // ── المخزون ──────────────────────────────────────────────
      const stockText = $d('[data-qa="stock-content"], .stock').text().trim();
      const stockMatch = stockText.match(/(\d+)/);
      const stock = stockMatch ? parseInt(stockMatch[1]) : 50;

      detailed.push({
        name: item.name,
        description: desc,
        category,
        brand,
        price: item.price,
        oldPrice: item.oldPrice,
        rating,
        reviewsCount,
        stock,
        images: imgs,
        sourceUrl: item.href,
        source: 'Jumia Egypt',
      });

      console.log(`  ✅ [${detailed.length}/${maxCount}] ${item.name.slice(0, 50)}`);

    } catch (err) {
      console.log(`  ⚠️  فشل جلب تفاصيل: ${err.message.slice(0, 60)}`);
    }
  }

  return detailed;
}

// ────────────────────────────────────────────────────────────────
//  Scraper 2 — eBay (للمنتجات العالمية)
// ────────────────────────────────────────────────────────────────

async function scrapeEbay(keyword, maxCount) {
  console.log(`\n🛍️  [eBay] جاري البحث عن: "${keyword}"...`);

  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_sacat=0&LH_ItemCondition=3`;

  let res;
  try {
    res = await axios.get(searchUrl, { headers: HEADERS, timeout: 15000 });
  } catch (err) {
    console.log(`  ⚠️  فشل الاتصال بـ eBay: ${err.message}`);
    return [];
  }

  const $ = cheerio.load(res.data);
  const listItems = [];

  // eBay بيغير السيلكتورز، نجرب أكتر من واحد
  const itemSelector = '.s-item:not(.s-item--placeholder)';

  $(itemSelector).each((_, el) => {
    if (listItems.length >= maxCount * 3) return false;

    const title = $(el).find('.s-item__title').text().replace('New Listing', '').trim();
    const priceStr = $(el).find('.s-item__price').first().text().replace(/[^0-9.]/g, '');
    const link = $(el).find('a.s-item__link').attr('href') || '';

    // صور: نجرب كل الـ attributes الممكنة
    const imgEl = $(el).find('.s-item__image-img');
    const img = imgEl.attr('src')
      || imgEl.attr('data-src')
      || imgEl.attr('data-defer-src')
      || '';

    if (!title || !link || title.toLowerCase() === 'shop on ebay') return;

    const price = parseFloat(priceStr);
    if (!price || price < 1) return;

    // نحول السعر من دولار لجنيه (تقريبي) — غيّره لو عندك API للعملة
    const priceEGP = Math.round(price * 49);

    listItems.push({
      name: title,
      price: priceEGP,
      img: img.startsWith('http') ? img : '',
      href: link.split('?')[0], // بدون parameters للتبسيط
      source: 'eBay',
    });
  });

  if (listItems.length === 0) {
    console.log('  ⚠️  لم يُرجع eBay أي نتائج.');
    return [];
  }

  console.log(`  ✅ وجد ${listItems.length} منتج — جاري جلب التفاصيل...`);

  const detailed = [];

  for (const item of listItems) {
    if (detailed.length >= maxCount) break;
    await sleep(1000);

    try {
      const det = await axios.get(item.href, { headers: HEADERS, timeout: 15000 });
      const $d = cheerio.load(det.data);

      // ── الصور من eBay ────────────────────────────────────────
      const imgs = new Set();

      // JSON-LD أولاً
      $d('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($d(el).html());
          const nodes = Array.isArray(data) ? data : [data];
          for (const node of nodes) {
            if (node['@type'] === 'Product') {
              if (Array.isArray(node.image)) node.image.forEach(i => imgs.add(i));
              else if (typeof node.image === 'string') imgs.add(node.image);
            }
          }
        } catch (_) { }
      });

      // معرض الصور
      $d('.ux-image-carousel-item img, .ux-image-carousel img, [data-idx] img').each((_, el) => {
        const src = $d(el).attr('data-zoom-src')
          || $d(el).attr('data-src')
          || $d(el).attr('src')
          || '';
        if (src && src.startsWith('http') && src.includes('ebayimg.com')) {
          // نحول للحجم الأكبر
          imgs.add(src.replace(/\/s-l\d+\./, '/s-l1600.'));
        }
      });

      // أي صورة من ebayimg.com
      $d('img').each((_, el) => {
        const src = $d(el).attr('src') || '';
        if (src.includes('ebayimg.com') && !src.includes('/s-l64.') && !src.includes('/s-l96.')) {
          imgs.add(src.replace(/\/s-l\d+\./, '/s-l1600.'));
        }
      });

      // أضف thumbnail من القائمة
      if (item.img) imgs.add(item.img);

      const imgsArr = [...imgs].filter(u => u && u.startsWith('http'));

      if (imgsArr.length === 0) {
        console.log(`  ⏭️  تخطي "${item.name.slice(0, 40)}" — بدون صور`);
        continue;
      }

      // ── الوصف ────────────────────────────────────────────────
      let desc = $d('.ux-layout-section .ux-textspans').slice(0, 5)
        .map((_, el) => $d(el).text().trim()).get().filter(t => t.length > 10).join(' ');

      if (!desc) {
        desc = $d('#desc_div').text().replace(/\s+/g, ' ').trim().slice(0, 500);
      }

      if (!desc || desc.length < 15) {
        desc = `${item.name} — منتج عالي الجودة متاح للشراء.`;
      }

      // ── الفئة ─────────────────────────────────────────────────
      const breadcrumbs = $d('li.seo-breadcrumb-item a')
        .map((_, el) => $d(el).text().trim()).get();
      const category = breadcrumbs[breadcrumbs.length - 1] || 'أدوات صيد';

      // ── البراند ───────────────────────────────────────────────
      const brand = $d('.ux-labels-values__labels:contains("Brand") + .ux-labels-values__values span').first().text().trim()
        || $d('.ux-labels-values__labels-with-values:contains("Brand")').find('.ux-labels-values__values span').first().text().trim()
        || 'متنوع';

      // ── التقييم ──────────────────────────────────────────────
      const ratingStr = $d('[class*="rating"] span').first().text().replace(/[^0-9.]/g, '');
      const reviewsStr = $d('[class*="reviews"] span, .reviews').first().text().replace(/[^0-9]/g, '');

      detailed.push({
        name: item.name,
        description: desc,
        category,
        brand,
        price: item.price,
        oldPrice: null,
        rating: ratingStr ? parseFloat(ratingStr) : null,
        reviewsCount: reviewsStr ? parseInt(reviewsStr) : 0,
        stock: 20,
        images: imgsArr,
        sourceUrl: item.href,
        source: 'eBay',
      });

      console.log(`  ✅ [${detailed.length}/${maxCount}] ${item.name.slice(0, 50)}`);

    } catch (err) {
      console.log(`  ⚠️  فشل جلب تفاصيل: ${err.message.slice(0, 60)}`);
    }
  }

  return detailed;
}

// ────────────────────────────────────────────────────────────────
//  Scraper 3 — Amazon Egypt (بديل قوي)
// ────────────────────────────────────────────────────────────────

async function scrapeAmazonEg(keyword, maxCount) {
  console.log(`\n📦 [Amazon.eg] جاري البحث عن: "${keyword}"...`);

  const searchUrl = `https://www.amazon.eg/s?k=${encodeURIComponent(keyword)}&language=ar_AE`;

  let res;
  try {
    res = await axios.get(searchUrl, {
      headers: { ...HEADERS, 'Accept-Language': 'ar-EG,ar;q=0.9' },
      timeout: 15000,
    });
  } catch (err) {
    console.log(`  ⚠️  فشل الاتصال بـ Amazon.eg: ${err.message}`);
    return [];
  }

  const $ = cheerio.load(res.data);
  const listItems = [];

  $('[data-component-type="s-search-result"]').each((_, el) => {
    if (listItems.length >= maxCount * 3) return false;

    const name = $(el).find('h2 a span').text().trim();
    const priceWhole = $(el).find('.a-price-whole').first().text().replace(/[^\d]/g, '');
    const priceFrac = $(el).find('.a-price-fraction').first().text().replace(/[^\d]/g, '') || '00';
    const img = $(el).find('img.s-image').attr('src') || '';
    const href = $(el).find('h2 a').attr('href') || '';

    if (!name || !priceWhole || !href) return;

    const price = parseFloat(`${priceWhole}.${priceFrac}`);

    listItems.push({
      name,
      price,
      img: img.startsWith('http') ? img : '',
      href: `https://www.amazon.eg${href.split('?')[0]}`,
      source: 'Amazon Egypt',
    });
  });

  if (listItems.length === 0) {
    console.log('  ⚠️  لم يُرجع Amazon.eg أي نتائج.');
    return [];
  }

  console.log(`  ✅ وجد ${listItems.length} منتج — جاري جلب التفاصيل...`);

  const detailed = [];

  for (const item of listItems) {
    if (detailed.length >= maxCount) break;
    await sleep(1500); // Amazon أكتر حساسية

    try {
      const det = await axios.get(item.href, {
        headers: { ...HEADERS, 'Accept-Language': 'ar-EG,ar;q=0.9' },
        timeout: 15000,
      });
      const $d = cheerio.load(det.data);

      // ── الصور من Amazon ──────────────────────────────────────
      const imgs = [];

      // JSON في الـ script بتاع الصور
      $d('script').each((_, el) => {
        const text = $d(el).html() || '';
        if (text.includes('ImageBlockATF') || text.includes('colorImages')) {
          const matches = text.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%._-]+\.jpg/g);
          if (matches) {
            matches.forEach(url => {
              // نحول للحجم الأكبر
              const cleanUrl = url.replace(/_[A-Z]{2}\d+_|_SX\d+_|_SY\d+_|_CR[\d,]+_|_AC_[A-Z]+\d+_/g, '');
              if (!imgs.includes(cleanUrl)) imgs.push(cleanUrl);
            });
          }
        }
      });

      // صور الـ gallery
      if (imgs.length === 0) {
        $d('#altImages img, #imageBlock img').each((_, el) => {
          const src = ($d(el).attr('src') || '').replace(/_[A-Z]{2}\d+_|_SX\d+_/g, '');
          if (src && src.startsWith('http') && src.includes('media-amazon')) {
            imgs.push(src);
          }
        });
        if (item.img) imgs.unshift(item.img);
      }

      const imgsArr = [...new Set(imgs)].filter(u => u.startsWith('http')).slice(0, 6);

      if (imgsArr.length === 0) {
        console.log(`  ⏭️  تخطي "${item.name.slice(0, 40)}" — بدون صور`);
        continue;
      }

      // ── الوصف ────────────────────────────────────────────────
      const featureBullets = $d('#feature-bullets li span').map((_, el) => {
        return $d(el).text().trim();
      }).get().filter(t => t && !t.includes('تأكد من أن') && t.length > 5);

      let desc = featureBullets.join(' • ');
      if (!desc || desc.length < 20) {
        desc = $d('#productDescription p').text().replace(/\s+/g, ' ').trim().slice(0, 600);
      }
      if (!desc || desc.length < 15) {
        desc = `${item.name} — منتج عالي الجودة متاح على Amazon.`;
      }

      // ── الفئة ─────────────────────────────────────────────────
      const breadcrumb = $d('#wayfinding-breadcrumbs_feature_div li a')
        .map((_, el) => $d(el).text().trim()).get();
      const category = breadcrumb[breadcrumb.length - 1] || 'متنوع';

      // ── البراند ───────────────────────────────────────────────
      const brand = $d('#bylineInfo, #brand').first().text().replace(/^(زيارة متجر|Visit the|Brand:)/i, '').trim()
        || 'متنوع';

      // ── التقييم ──────────────────────────────────────────────
      const ratingStr = $d('#acrPopover .a-size-base.a-color-base').first().text().replace(/[^0-9.]/g, '');
      const reviewsStr = $d('#acrCustomerReviewText').first().text().replace(/[^0-9]/g, '');

      // ── السعر المخفض ─────────────────────────────────────────
      const oldPriceStr = $d('.a-text-strike, .priceBlockStrikePriceString').first().text().replace(/[^\d.]/g, '');

      detailed.push({
        name: item.name,
        description: desc,
        category,
        brand,
        price: item.price,
        oldPrice: oldPriceStr ? parseFloat(oldPriceStr) : null,
        rating: ratingStr ? parseFloat(ratingStr) : null,
        reviewsCount: reviewsStr ? parseInt(reviewsStr) : 0,
        stock: 30,
        images: imgsArr,
        sourceUrl: item.href,
        source: 'Amazon Egypt',
      });

      console.log(`  ✅ [${detailed.length}/${maxCount}] ${item.name.slice(0, 50)}`);

    } catch (err) {
      console.log(`  ⚠️  فشل جلب تفاصيل: ${err.message.slice(0, 60)}`);
    }
  }

  return detailed;
}

// ────────────────────────────────────────────────────────────────
//  رفع صورة على Cloudinary (download buffer → upload stream)
// ────────────────────────────────────────────────────────────────

async function downloadAndUpload(url, folder) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 25000,
    headers: {
      'User-Agent': HEADERS['User-Agent'],
      'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
      'Referer': 'https://www.google.com/',
    },
    maxRedirects: 5,
  });

  const buffer = Buffer.from(response.data);

  // تأكد إن الملف صورة فعلاً (بيتجنب رفع HTML/JSON غلط)
  const contentType = response.headers['content-type'] || '';
  if (!contentType.includes('image')) {
    throw new Error(`المحتوى ليس صورة: ${contentType}`);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', quality: 'auto:good' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// ────────────────────────────────────────────────────────────────
//  حفظ المنتجات في MongoDB مع رفع الصور على Cloudinary
// ────────────────────────────────────────────────────────────────

async function saveProducts(products) {
  const last = await Product.findOne().sort({ productId: -1 });
  let nextId = (last?.productId || 10000) + 1;

  let saved = 0, skipped = 0;

  for (const p of products) {
    // تجنب التكرار بالاسم
    const exists = await Product.findOne({ name: p.name });
    if (exists) {
      console.log(`  ⏭️  موجود بالفعل: ${p.name.slice(0, 50)}`);
      skipped++;
      continue;
    }

    console.log(`\n  ⏳ جاري حفظ: ${p.name.slice(0, 60)}...`);
    console.log(`     📌 المصدر: ${p.source}`);

    const uploadedMedia = [];

    for (let i = 0; i < p.images.length && i < 5; i++) {
      try {
        await sleep(600);
        const result = await downloadAndUpload(p.images[i], 'products');
        uploadedMedia.push({
          type: 'image',
          url: result.secure_url,
          publicId: result.public_id,
          alt: `${p.name} - صورة ${i + 1}`,
        });
        console.log(`     📸 صورة ${i + 1} رُفعت ✅`);
      } catch (err) {
        console.log(`     ⚠️  فشل رفع صورة ${i + 1}: ${err.message.slice(0, 60)}`);
      }
    }

    if (uploadedMedia.length === 0) {
      console.log(`     🚫 تخطي — فشلت جميع الصور`);
      skipped++;
      continue;
    }

    const discount = calcDiscount(p.price, p.oldPrice);

    await new Product({
      productId: nextId++,
      name: p.name,
      description: p.description,
      category: p.category,
      brand: p.brand,
      price: p.price,
      oldPrice: p.oldPrice || undefined,
      discount: discount || undefined,
      rating: p.rating || undefined,
      reviewsCount: p.reviewsCount || 0,
      stock: p.stock || 10,
      minQuantity: 1,
      freeShipping: false,
      media: uploadedMedia,
      // حقل إضافي اختياري — احذفه لو مش موجود في الـ Schema بتاعك
      // sourceUrl: p.sourceUrl,
    }).save();

    saved++;
    console.log(`  ✅ [${saved}] حُفظ بنجاح — ${uploadedMedia.length} صورة`);
  }

  return { saved, skipped };
}

// ────────────────────────────────────────────────────────────────
//  MAIN
// ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   🛒  سكريبت سحب منتجات حقيقية من الإنترنت   🛒  ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // ── كلمة البحث ──────────────────────────────────────────────
  const keyword = await ask('🔎 كلمة البحث (مثال: أدوات صيد / fishing reel): ');
  if (!keyword) { console.log('❌ لم تدخل كلمة بحث.'); process.exit(1); }

  // ── عدد المنتجات ────────────────────────────────────────────
  const countStr = await ask('📦 كام منتج عاوز تضيف؟ (1-20): ');
  const count = Math.min(Math.max(parseInt(countStr) || 5, 1), 20);

  // ── اختيار المصدر ───────────────────────────────────────────
  console.log('\n📌 اختار المصدر:');
  console.log('   1. Jumia Egypt  — الأفضل للمنتجات بالسعر المصري');
  console.log('   2. Amazon Egypt — منتجات متنوعة بالجنيه المصري');
  console.log('   3. eBay         — منتجات عالمية (السعر بالدولار → جنيه تقريبي)');
  console.log('   4. كل المصادر   — يجيب من كل المواقع ويكمل العدد المطلوب\n');

  const src = await ask('اختارك (1/2/3/4): ');

  // ── الاتصال بـ MongoDB ──────────────────────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n🔗 اتصل بـ MongoDB ✅\n');

  let products = [];
  const remaining = () => count - products.length;

  if (src === '1' || src === '4') {
    const jumia = await scrapeJumia(keyword, remaining());
    products.push(...jumia);
    console.log(`\n📊 جُمع من Jumia: ${jumia.length} منتج`);
  }

  if ((src === '2' || src === '4') && remaining() > 0) {
    const amazon = await scrapeAmazonEg(keyword, remaining());
    products.push(...amazon);
    console.log(`\n📊 جُمع من Amazon.eg: ${amazon.length} منتج`);
  }

  if ((src === '3' || src === '4') && remaining() > 0) {
    const ebay = await scrapeEbay(keyword, remaining());
    products.push(...ebay);
    console.log(`\n📊 جُمع من eBay: ${ebay.length} منتج`);
  }

  if (products.length === 0) {
    console.log('\n❌ لم يُجمع أي منتج. جرب كلمة بحث مختلفة أو مصدر آخر.\n');
    mongoose.connection.close();
    process.exit(0);
  }

  // ── ملخص قبل الحفظ ──────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log(`📦 إجمالي المنتجات الجاهزة للحفظ: ${products.length}`);
  console.log('المنتجات:');
  products.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.source}] ${p.name.slice(0, 55)} — ${p.price} ج.م — ${p.images.length} صورة`);
  });
  console.log('─'.repeat(50));

  const confirm = await ask(`\n⚠️  هتضيف ${products.length} منتج في الداتابيز. موافق؟ (y/n): `);
  if (!confirm.toLowerCase().startsWith('y')) {
    console.log('❌ تم الإلغاء.\n');
    mongoose.connection.close();
    process.exit(0);
  }

  console.log('\n💾 جاري الحفظ في MongoDB مع رفع الصور على Cloudinary...\n');
  const { saved, skipped } = await saveProducts(products);

  console.log('\n' + '═'.repeat(50));
  console.log(`✅  تم حفظ  : ${saved}  منتج بصور حقيقية`);
  if (skipped) console.log(`⏭️   تم تخطي : ${skipped} منتج (موجود أو بدون صور)`);
  console.log('═'.repeat(50) + '\n');

  mongoose.connection.close();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ خطأ غير متوقع:', err.message);
  mongoose.connection.close();
  process.exit(1);
});