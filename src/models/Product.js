import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    stock: { type: Number, default: 0 }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },

    price: { type: Number, required: true },

    compareAtPrice: { type: Number, default: 0 },

    // ✅ Multiple Images (এইটাই দরকার)
    images: [{ type: String }],

    description: { type: String, default: "" },

    variants: [variantSchema],

    deliveryDays: { type: String, default: "3-5 days" },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
