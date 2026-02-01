import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },
    image: { type: String, default: "" },
    variant: { type: String, default: "" },
    qty: { type: Number, required: true },
    price: { type: Number, required: true }
  },
  { _id: false }
);

const shippingSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone1: { type: String, required: true },
    phone2: { type: String, default: "" },
    division: { type: String, required: true },
    district: { type: String, required: true },
    upazila: { type: String, required: true },
    addressLine: { type: String, required: true },
    note: { type: String, default: "" }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    shipping: { type: shippingSchema, required: true },
    paymentMethod: { type: String, enum: ["COD", "FULL_PAYMENT"], default: "COD" },
    deliveryCharge: { type: Number, default: 110 },
    subTotal: { type: Number, required: true },
    total: { type: Number, required: true },

    status: {
      type: String,
      enum: ["PLACED", "CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED"],
      default: "PLACED"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
