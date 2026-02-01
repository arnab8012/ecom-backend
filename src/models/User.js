import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"], default: "MALE" },
    dateOfBirth: { type: Date, default: null },
    permanentAddress: { type: String, default: "" },
    status: { type: String, enum: ["ACTIVE", "BLOCKED"], default: "ACTIVE" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
