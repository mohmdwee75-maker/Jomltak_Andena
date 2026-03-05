// models/Customer.js
const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
    user_ID: { type: Number, unique: true },
    F_name: String,
    L_name: String,
    Phone: String,
    User_name: String,
    Pass: String,
    city: String,
    notes: String,
    order_count: Number,
    created_at: { type: Date, default: Date.now },
    Birth_date: Date,
    image: String,
    wishlist: [{ type: mongoose.Schema.Types.Mixed }],
    // ── جديد ──
    isBanned:    { type: Boolean, default: false },
    bannedUntil: { type: Date,    default: null  },
    messages:    [{ 
        from:    { type: String, default: 'admin' },
        text:    String,
        sentAt:  { type: Date, default: Date.now },
        isRead:  { type: Boolean, default: false }
    }]
});

const Customer = mongoose.model("Customer", customerSchema);
module.exports = Customer;