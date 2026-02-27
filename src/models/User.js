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
  { timestamps: true } // ✅ each address has createdAt/updatedAt
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
 * - if any shippingAddresses marked isDefault, keep first as default, unset others
 * - also sync defaultShippingAddressId
 */
userSchema.pre("save", function (next) {
  try {
    if (Array.isArray(this.shippingAddresses) && this.shippingAddresses.length) {
      const defaults = this.shippingAddresses.filter((a) => a.isDefault);

      if (defaults.length > 1) {
        // keep first default, unset rest
        let kept = false;
        this.shippingAddresses = this.shippingAddresses.map((a) => {
          if (a.isDefault) {
            if (!kept) {
              kept = true;
              return a;
            }
            a.isDefault = false;
          }
          return a;
        });
      }

      const def = this.shippingAddresses.find((a) => a.isDefault);
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