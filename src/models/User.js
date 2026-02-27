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
     * ✅ NEW (multiple): saved address book (multi-device)
     */
    shippingAddresses: { type: [shippingAddressSchema], default: [] },

    /**
     * ✅ Optional: track which one is default (fast + reliable)
     * store subdoc _id as string
     */
    defaultShippingAddressId: { type: String, default: "" },

    /**
     * ✅ OLD (single): keep for backward compatibility
     * You can remove later after migration.
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
 * ✅ Ensure only ONE default address
 * - if defaultShippingAddressId exists & valid => enforce it
 * - if multiple isDefault => keep first only
 * - if none default => set first as default
 * - always sync defaultShippingAddressId
 */
userSchema.pre("save", function (next) {
  try {
    const list = Array.isArray(this.shippingAddresses) ? this.shippingAddresses : [];

    if (!list.length) {
      this.defaultShippingAddressId = "";
      return next();
    }

    // 1) enforce defaultShippingAddressId if valid
    if (this.defaultShippingAddressId) {
      const id = String(this.defaultShippingAddressId);
      const exists = list.some((a) => String(a._id) === id);

      if (exists) {
        list.forEach((a) => {
          a.isDefault = String(a._id) === id;
        });
      } else {
        this.defaultShippingAddressId = "";
      }
    }

    // 2) if multiple defaults -> keep first
    let kept = false;
    list.forEach((a) => {
      if (a.isDefault) {
        if (!kept) kept = true;
        else a.isDefault = false;
      }
    });

    // 3) if still none default -> set first default ✅
    const def = list.find((a) => a.isDefault);
    if (!def) {
      list.forEach((a) => (a.isDefault = false));
      list[0].isDefault = true;
      this.defaultShippingAddressId = String(list[0]._id);
    } else {
      this.defaultShippingAddressId = String(def._id);
    }

    this.shippingAddresses = list;
    next();
  } catch (e) {
    next(e);
  }
});

export default mongoose.model("User", userSchema);