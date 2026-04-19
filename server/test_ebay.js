/**
 * اختبار سحب منتجات صيد من eBay
 */
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

async function main() {
  // 1. جيب قائمة المنتجات من eBay
  console.log('🔍 Searching eBay...');
  const searchRes = await axios.get(
    'https://www.ebay.com/sch/i.html?_nkw=fishing+reel&_sacat=11116&LH_ItemCondition=3',
    { headers: HEADERS, timeout: 15000 }
  );
  
  const $ = cheerio.load(searchRes.data);
  const items = [];
  
  $('.s-item').each((i, el) => {
    if (items.length >= 5) return false;
    const title = $(el).find('.s-item__title').text().trim();
    const price = $(el).find('.s-item__price').text().trim();
    const link = $(el).find('a.s-item__link').attr('href');
    const thumb = $(el).find('.s-item__image-img').attr('src') || 
                  $(el).find('.s-item__image-img').attr('data-src');
    
    if (title && link && !link.includes('itm/123456?')) {
      items.push({ title, price, link, thumb });
    }
  });
  
  console.log(`✅ Found ${items.length} items on eBay search page`);
  console.log(items);
  
  if (items.length === 0) {
    console.log('❌ No items found. Saving HTML for inspection...');
    fs.writeFileSync('ebay_search.html', searchRes.data);
    console.log('Saved to ebay_search.html');
    return;
  }
  
  // 2. جيب تفاصيل أول منتج
  const firstItem = items.find(i => i.link);
  if (!firstItem) return;
  
  console.log(`\n🔍 Getting details for: ${firstItem.title}`);
  const detailRes = await axios.get(firstItem.link, { headers: HEADERS, timeout: 15000 });
  const $d = cheerio.load(detailRes.data);
  
  // استخراج الصور
  const images = new Set();
  
  // eBay gallery images
  $d('.ux-image-carousel-item img, .ux-image-carousel img').each((i, el) => {
    const src = $d(el).attr('src') || $d(el).attr('data-src') || $d(el).attr('data-zoom-src');
    if (src && src.startsWith('http') && !src.includes('s-l64.')) {
      images.add(src.replace('s-l400', 's-l800').replace('s-l225', 's-l800'));
    }
  });
  
  // JSON-LD
  $d('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($d(el).html());
      if (data.image) {
        if (Array.isArray(data.image)) data.image.forEach(img => images.add(img));
        else images.add(data.image);
      }
    } catch(e) {}
  });
  
  // Any ebayimg.com image
  $d('img').each((i, el) => {
    const src = $d(el).attr('src');
    if (src && src.includes('ebayimg.com') && !src.includes('/s-l64.') && !src.includes('/s-l96.')) {
      images.add(src.replace(/\/s-l\d+\./, '/s-l800.'));
    }
  });
  
  // Description
  const desc = $d('.ux-layout-section .ux-textspans').first().text().trim() 
    || $d('#desc_div').text().trim()
    || '';
  
  console.log('\n📸 Images found:', [...images].slice(0, 5));
  console.log('\n📝 Description preview:', desc.slice(0, 200));
  
  // Save detail page
  fs.writeFileSync('ebay_detail.html', detailRes.data);
  console.log('\n💾 Detail HTML saved to ebay_detail.html for inspection');
}

main().catch(console.error);
