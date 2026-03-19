import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    name: { type: String, default: "" },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },
  },
  { timestamps: true }
);

// ✅ 1 user = 1 review per product
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);