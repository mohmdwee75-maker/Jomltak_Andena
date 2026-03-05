const mongoose = require('mongoose'); 

const productSchema = new mongoose.Schema({
  productId: { type: Number, unique: true },
  name: { type: String, required: true },
  description: String,
  price: Number,
  oldPrice: Number,
  discount: String,
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  minQuantity: { type: Number, default: 1 },
  freeShipping: { type: Boolean, default: false },
  freeShippingMin: { type: Number, default: 0 },

  // ✅ ضيف الـ 3 دول
  category: { type: String, default: '' },
  brand:    { type: String, default: '' },
  stock:    { type: Number, default: 0 },

  media: [
    {
      type: { type: String, enum: ['image', 'video'] },
      url: String,
      publicId: String,
      alt: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);