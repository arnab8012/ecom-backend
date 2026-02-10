import mongoose from "mongoose";

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, default: "" }, // receiver name (optional)
    phone1: { type: String, trim: true, default: "" },
    phone2: { type: String, trim: true, default: "" },
    division: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "" },
    upazila: { type: String, trim: true, default: "" },
    union: { type: String, trim: true, default: "" },
    village: { type: String, trim: true, default: "" },
    addressLine: { type: String, trim: true, default: "" },
    postalCode: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // ✅ basic identity
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },

    // ✅ auth
    passwordHash: { type: String, required: true },

    // ✅ optional profile
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"], default: "MALE" },
    dateOfBirth: { type: Date, default: null },

    // ✅ addresses
    permanentAddress: { type: String, default: "" },

    // ✅ saved shipping (for next orders / other device login)
    shippingAddress: { type: shippingAddressSchema, default: () => ({}) },

    // ✅ status
    status: { type: String, enum: ["ACTIVE", "BLOCKED"], default: "ACTIVE" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);