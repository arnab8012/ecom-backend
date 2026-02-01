import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// ✅ Register
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { fullName, phone, password, gender } = req.body;

    if (!fullName || !phone || !password) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    const exists = await User.findOne({ phone });
    if (exists) return res.status(409).json({ ok: false, message: "Phone already used" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      phone,
      passwordHash,
      gender: gender || "MALE"
    });

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        gender: user.gender,
        status: user.status,
        dateOfBirth: user.dateOfBirth,
        permanentAddress: user.permanentAddress,
        createdAt: user.createdAt
      }
    });
  })
);

// ✅ Login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ ok: false, message: "Missing fields" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ ok: false, message: "Invalid credentials" });
    if (user.status !== "ACTIVE") return res.status(403).json({ ok: false, message: "User blocked" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        gender: user.gender,
        status: user.status,
        dateOfBirth: user.dateOfBirth,
        permanentAddress: user.permanentAddress,
        createdAt: user.createdAt
      }
    });
  })
);

// ✅ Me (only ONE route, no duplicate)
router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    // auth middleware already sets req.user
    res.json({ ok: true, user: req.user });
  })
);

// ✅ Update me
router.put(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const { fullName, permanentAddress, dateOfBirth, gender } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    if (typeof fullName === "string") user.fullName = fullName;
    if (typeof permanentAddress === "string") user.permanentAddress = permanentAddress;
    if (typeof gender === "string") user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);

    await user.save();

    res.json({
      ok: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        gender: user.gender,
        status: user.status,
        dateOfBirth: user.dateOfBirth,
        permanentAddress: user.permanentAddress,
        createdAt: user.createdAt
      }
    });
  })
);

export default router;
