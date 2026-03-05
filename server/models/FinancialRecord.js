const mongoose = require('mongoose');

const financialRecordSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['income', 'withdrawal', 'deposit'],
    required: true
  },
  // income = دخل من أوردر | withdrawal = سحب يدوي
  amount:      { type: Number, required: true },
  description: { type: String, required: true },
  purpose:     String, // هدف السحب
  
  // لو income - ربطه بالأوردر
  order_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderId:     Number,

  // مين عمل العملية
  doneBy: {
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    name:     String,
  },

}, { timestamps: true });

module.exports = mongoose.model('FinancialRecord', financialRecordSchema);