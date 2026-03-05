const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({

  supplierId: { type: Number, unique: true },
  name:       { type: String, required: true },
  email:      { type: String },                               // اختياري — للتواصل فقط
  phone:      { type: String, required: true, unique: true }, // ← بيتسجل بيه
  password:   { type: String, required: true },
  image:      { type: String },
  role:       { type: String, default: 'supplier' },

  company:    { type: String },
  notes:      { type: String },
  isActive:   { type: Boolean, default: true },

  stats: {
    totalReceived:    { type: Number, default: 0 },
    totalApproved:    { type: Number, default: 0 },
    totalRejected:    { type: Number, default: 0 },
    totalDelivered:   { type: Number, default: 0 },
    onTimeDeliveries: { type: Number, default: 0 },
  },

  rating: { type: Number, default: 0, min: 0, max: 5 },

}, { timestamps: true });

supplierSchema.virtual('approvalRate').get(function () {
  if (!this.stats.totalReceived) return 0;
  return ((this.stats.totalApproved / this.stats.totalReceived) * 100).toFixed(1);
});

supplierSchema.virtual('onTimeRate').get(function () {
  if (!this.stats.totalDelivered) return 0;
  return ((this.stats.onTimeDeliveries / this.stats.totalDelivered) * 100).toFixed(1);
});

supplierSchema.methods.recordDecision = async function (approved) {
  this.stats.totalReceived += 1;
  if (approved) this.stats.totalApproved += 1;
  else          this.stats.totalRejected += 1;
  return this.save();
};

supplierSchema.methods.recordDelivery = async function (onTime = false) {
  this.stats.totalDelivered += 1;
  if (onTime) this.stats.onTimeDeliveries += 1;
  return this.save();
};

module.exports = mongoose.model('Supplier', supplierSchema);