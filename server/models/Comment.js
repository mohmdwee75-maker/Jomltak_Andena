const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
    {
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",       // نفس اسم الـ model في productSchema
            required: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",      // نفس اسم الـ model في customerSchema
            required: true,
        },
        text: { type: String, required: true },
        rating: { type: Number, min: 1, max: 5 },
        images: [{ type: String }],              // صور في التعليق (اختياري)
        likes: { type: Number, default: 0 },
        is_verified_purchase: { type: Boolean, default: false },
    },
    { timestamps: true }   // بيعمل createdAt و updatedAt تلقائي زي productSchema
);

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
