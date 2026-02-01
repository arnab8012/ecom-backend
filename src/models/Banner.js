import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Banner", bannerSchema);
