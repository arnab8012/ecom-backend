import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// helper: safe user payload
const toUserPayload = (user) => ({
  id: user._id,
  fullName: user.fullName,
  phone: user.phone,
  gender: user.gender,
  status: user.status,
  dateOfBirth: user.dateOfBirth,
  permanentAddress: user.permanentAddress,
  shippingAddress: user.shippingAddress || {},
  createdAt: user.createdAt,
});

// ✅ Register
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { fullName, phone, password, gender } = req.body;

    if (!fullName || !phone || !password) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    const exists = await User.findOne({ phone: String(phone).trim() });
    if (exists) return res.status(409).json({ ok: false, message: "Phone already used" });

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      passwordHash,
      gender: gender || "MALE",
      // shippingAddress default model থেকে হবে
    });

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      ok: true,
      token,
      user: toUserPayload(user),
    });
  })
);

// ✅ Login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ ok: false, message: "Missing fields" });

    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) return res.status(401).json({ ok: false, message: "Invalid credentials" });
    if (user.status !== "ACTIVE") return res.status(403).json({ ok: false, message: "User blocked" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      ok: true,
      token,
      user: toUserPayload(user),
    });
  })
);

// ✅ Me (only ONE route, no duplicate)
router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    // auth middleware already sets req.user
    res.json({ ok: true, user: toUserPayload(req.user) });
  })
);

// ✅ Update me (profile + shippingAddress)
router.put(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const { fullName, permanentAddress, dateOfBirth, gender, shippingAddress } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    // profile
    if (typeof fullName === "string") user.fullName = fullName.trim();
    if (typeof permanentAddress === "string") user.permanentAddress = permanentAddress;
    if (typeof gender === "string") user.gender = gender;

    if (dateOfBirth) {
      const d = new Date(dateOfBirth);
      if (!isNaN(d.getTime())) user.dateOfBirth = d;
    }

    // ✅ shippingAddress merge (partial update allowed)
    if (shippingAddress && typeof shippingAddress === "object") {
      user.shippingAddress = {
        ...(user.shippingAddress || {}),
        ...(shippingAddress || {}),
      };
    }

    await user.save();

    res.json({
      ok: true,
      user: toUserPayload(user),
    });
  })
);

// ✅ Forgot Password (phone + fullName match -> set new password)
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { phone, fullName, newPassword } = req.body;

    if (!phone || !fullName || !newPassword) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    // match fullName (case-insensitive, trim)
    const a = String(user.fullName || "").trim().toLowerCase();
    const b = String(fullName).trim().toLowerCase();
    if (a !== b) return res.status(401).json({ ok: false, message: "Name/phone did not match" });

    if (String(newPassword).length < 4) {
      return res.status(400).json({ ok: false, message: "Password too short" });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    res.json({ ok: true, message: "Password updated" });
  })
);

export default router;