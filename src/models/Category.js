import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    icon: { type: String, default: "" } 
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
