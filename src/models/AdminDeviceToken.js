import mongoose from "mongoose";

const adminDeviceTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    adminEmail: { type: String, default: "" },
    platform: { type: String, default: "android" },
  },
  { timestamps: true }
);

const AdminDeviceToken = mongoose.model(
  "AdminDeviceToken",
  adminDeviceTokenSchema
);

export default AdminDeviceToken;