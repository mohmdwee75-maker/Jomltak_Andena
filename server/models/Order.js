const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId:    { type: Number, unique: true },

  items: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name:       String,
      price:      Number,
      quantity:   Number,
      subtotal:   Number,
      image:      String,
    }
  ],

  totalPrice:  { type: Number, required: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  deliveryInfo: {
    fullName:      { type: String, required: true },
    phone:         { type: String, required: true },
    address:       { type: String, required: true },
    street:        String,
    building:      String,
    city:          { type: String, required: true },
    district:      String,
    governorate:   { type: String, required: true },
    landmark:      String,
    addressType:   { type: String, enum: ['home', 'office'], default: 'home' },
    requestedDate: { type: Date, required: true },
    notes:         String,
  },


  // ── سبب الإلغاء ──
  cancellation: {
    cancelledAt:  Date,
    reason:       String,
    cancelledBy:  { type: String, enum: ['customer', 'admin'] },
  },

  adminApproval: {
    approved:   { type: Boolean, default: false },
    admin_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: Date,
    notes:      String,
  },

  supplierApproval: {
    approved:     { type: Boolean, default: false },
    supplier_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    approvedAt:   Date,
    deliveryDate: Date,
    notes:        String,
  },
  status: {
  type: String,
  enum: ['pending', 'admin_approved', 'supplier_approved', 'shipped', 
         'customer_confirmed', 'delivered', 'rejected', 'cancelled'], // ← أضف customer_confirmed
  default: 'pending'
},

// ── تأكيد التسليم ── أضفه بعد supplierApproval
delivery: {
  confirmedAt:   Date,
  confirmedBy:   { type: String, enum: ['customer', 'admin'] },
  confirmedById: { type: mongoose.Schema.Types.ObjectId },
},

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);