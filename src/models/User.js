import mongoose from "mongoose";

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "" },
    phone1: { type: String, default: "" },
    phone2: { type: String, default: "" },
    division: { type: String, default: "" },
    district: { type: String, default: "" },
    upazila: { type: String, default: "" },
    union: { type: String, default: "" },
    postCode: { type: String, default: "" },
    addressLine: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },

    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"], default: "MALE" },
    dateOfBirth: { type: Date, default: null },

    permanentAddress: { type: String, default: "" },

    // ✅ NEW: shipping address saved with user
    shippingAddress: { type: shippingAddressSchema, default: () => ({}) },

    status: { type: String, enum: ["ACTIVE", "BLOCKED"], default: "ACTIVE" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);