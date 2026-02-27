import mongoose from "mongoose";

/**
 * ✅ Single shipping address (subdocument)
 * - _id enabled (default) so we can update/delete specific address
 */
const shippingAddressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home", trim: true },
    isDefault: { type: Boolean, default: false },

    fullName: { type: String, default: "", trim: true },
    phone1: { type: String, default: "", trim: true },
    phone2: { type: String, default: "", trim: true },

    division: { type: String, default: "Dhaka", trim: true },
    district: { type: String, default: "", trim: true },
    upazila: { type: String, default: "", trim: true },
    union: { type: String, default: "", trim: true },
    postCode: { type: String, default: "", trim: true },

    addressLine: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    passwordHash: { type: String, required: true },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      default: "MALE",
    },

    dateOfBirth: { type: Date, default: null },

    permanentAddress: { type: String, default: "", trim: true },

    /**
     * ✅ NEW: multiple address book
     */
    shippingAddresses: { type: [shippingAddressSchema], default: [] },

    /**
     * ✅ store default subdoc id
     */
    defaultShippingAddressId: { type: String, default: "" },

    /**
     * ✅ OLD single (optional - backward compatibility)
     */
    shippingAddress: {
      type: shippingAddressSchema,
      default: () => ({}),
    },

    status: { type: String, enum: ["ACTIVE", "BLOCKED"], default: "ACTIVE" },
  },
  { timestamps: true }
);

/**
 * ✅ Ensure only ONE default address & sync defaultShippingAddressId
 */
userSchema.pre("save", function (next) {
  try {
    const list = Array.isArray(this.shippingAddresses) ? this.shippingAddresses : [];

    if (list.length) {
      const defaults = list.filter((a) => a.isDefault);

      if (defaults.length > 1) {
        let kept = false;
        list.forEach((a) => {
          if (a.isDefault) {
            if (!kept) kept = true;
            else a.isDefault = false;
          }
        });
      }

      const def = list.find((a) => a.isDefault);
      this.defaultShippingAddressId = def ? String(def._id) : this.defaultShippingAddressId || "";
    } else {
      this.defaultShippingAddressId = "";
    }

    next();
  } catch (e) {
    next(e);
  }
});

export default mongoose.model("User", userSchema);