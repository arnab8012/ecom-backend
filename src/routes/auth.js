import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/* =========================
   Helpers
========================= */

const toUserPayload = (user) => ({
  id: user._id,
  fullName: user.fullName,
  phone: user.phone,
  gender: user.gender,
  status: user.status,
  dateOfBirth: user.dateOfBirth,
  permanentAddress: user.permanentAddress,

  shippingAddresses: Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [],
  defaultShippingAddressId: user.defaultShippingAddressId || "",

  // legacy single
  shippingAddress: user.shippingAddress || {},

  createdAt: user.createdAt,
});

function normShip(input = {}) {
  const s = input || {};
  return {
    label: String(s.label || "Home").trim() || "Home",
    isDefault: Boolean(s.isDefault),

    fullName: String(s.fullName || "").trim(),
    phone1: String(s.phone1 || "").trim(),
    phone2: String(s.phone2 || "").trim(),

    division: String(s.division || "Dhaka").trim() || "Dhaka",
    district: String(s.district || "").trim(),
    upazila: String(s.upazila || "").trim(),
    union: String(s.union || "").trim(),
    postCode: String(s.postCode || "").trim(),

    addressLine: String(s.addressLine || "").trim(),
    note: String(s.note || "").trim(),
  };
}

function ensureSingleDefault(user) {
  const list = Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [];

  // enforce defaultShippingAddressId if valid
  if (user.defaultShippingAddressId) {
    const id = String(user.defaultShippingAddressId);
    let found = false;

    list.forEach((a) => {
      const match = String(a._id) === id;
      if (match) found = true;
      a.isDefault = match;
    });

    if (!found) user.defaultShippingAddressId = "";
  }

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
  if (def) user.defaultShippingAddressId = String(def._id);

  user.shippingAddresses = list;
}

async function migrateSingleToMulti(user) {
  const list = Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [];
  if (list.length) return false;

  const s = user.shippingAddress || {};
  const hasData =
    String(s.fullName || "").trim() ||
    String(s.phone1 || "").trim() ||
    String(s.district || "").trim() ||
    String(s.upazila || "").trim() ||
    String(s.addressLine || "").trim();

  if (!hasData) return false;

  const migrated = normShip({ ...s, label: "Home", isDefault: true });

  user.shippingAddresses = [migrated];
  ensureSingleDefault(user);
  await user.save();
  return true;
}

/* =========================
   Auth
========================= */

// Register
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
      shippingAddresses: [],
      defaultShippingAddressId: "",
    });

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ ok: true, token, user: toUserPayload(user) });
  })
);

// Login
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

    res.json({ ok: true, token, user: toUserPayload(user) });
  })
);

/* =========================
   Me + Profile
========================= */

// Me
router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    await migrateSingleToMulti(req.user);

    const fresh = await User.findById(req.user._id);
    return res.json({ ok: true, user: toUserPayload(fresh) });
  })
);

// Update me
router.put(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    const {
      fullName,
      permanentAddress,
      dateOfBirth,
      gender,
      shippingAddress,
      shippingAddresses,
      defaultShippingAddressId,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    if (typeof fullName === "string") user.fullName = fullName.trim();
    if (typeof permanentAddress === "string") user.permanentAddress = permanentAddress;
    if (typeof gender === "string") user.gender = gender;

    if (dateOfBirth) {
      const d = new Date(dateOfBirth);
      if (!isNaN(d.getTime())) user.dateOfBirth = d;
    }

    // legacy single merge
    if (shippingAddress && typeof shippingAddress === "object") {
      user.shippingAddress = {
        ...(user.shippingAddress || {}),
        ...(shippingAddress || {}),
      };
    }

    // optional full replace
    if (Array.isArray(shippingAddresses)) {
      user.shippingAddresses = shippingAddresses.map((x) => normShip(x));
    }

    if (typeof defaultShippingAddressId === "string") {
      user.defaultShippingAddressId = defaultShippingAddressId;
    }

    ensureSingleDefault(user);
    await user.save();

    res.json({ ok: true, user: toUserPayload(user) });
  })
);

/* =========================
   Shipping Address Book
   Base: /api/auth/shipping
========================= */

// List
router.get(
  "/shipping",
  auth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    await migrateSingleToMulti(user);

    return res.json({
      ok: true,
      items: Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [],
      defaultShippingAddressId: user.defaultShippingAddressId || "",
    });
  })
);

// Add
router.post(
  "/shipping",
  auth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    const ship = normShip(req.body || {});
    const list = Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [];

    if (!list.length) ship.isDefault = true;

    if (ship.isDefault) list.forEach((a) => (a.isDefault = false));

    list.unshift(ship);
    user.shippingAddresses = list;

    ensureSingleDefault(user);
    await user.save();

    res.json({ ok: true, user: toUserPayload(user) });
  })
);

// Update one
router.put(
  "/shipping/:id",
  auth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    const list = Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [];
    const addr = list.find((a) => String(a._id) === String(id));
    if (!addr) return res.status(404).json({ ok: false, message: "Address not found" });

    const patch = normShip({ ...addr.toObject(), ...(req.body || {}) });

    addr.label = patch.label;
    addr.fullName = patch.fullName;
    addr.phone1 = patch.phone1;
    addr.phone2 = patch.phone2;
    addr.division = patch.division;
    addr.district = patch.district;
    addr.upazila = patch.upazila;
    addr.union = patch.union;
    addr.postCode = patch.postCode;
    addr.addressLine = patch.addressLine;
    addr.note = patch.note;

    if (req.body?.isDefault === true) {
      list.forEach((a) => (a.isDefault = String(a._id) === String(id)));
      user.defaultShippingAddressId = String(id);
    }

    user.shippingAddresses = list;
    ensureSingleDefault(user);
    await user.save();

    res.json({ ok: true, user: toUserPayload(user) });
  })
);

// Delete one
router.delete(
  "/shipping/:id",
  auth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    let list = Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [];
    const before = list.length;

    list = list.filter((a) => String(a._id) !== String(id));
    if (list.length === before) return res.status(404).json({ ok: false, message: "Address not found" });

    if (String(user.defaultShippingAddressId || "") === String(id)) {
      user.defaultShippingAddressId = "";
      if (list[0]) list[0].isDefault = true;
    }

    user.shippingAddresses = list;
    ensureSingleDefault(user);
    await user.save();

    res.json({ ok: true, user: toUserPayload(user) });
  })
);

// Set default
router.post(
  "/shipping/:id/default",
  auth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    const list = Array.isArray(user.shippingAddresses) ? user.shippingAddresses : [];
    const exists = list.some((a) => String(a._id) === String(id));
    if (!exists) return res.status(404).json({ ok: false, message: "Address not found" });

    list.forEach((a) => (a.isDefault = String(a._id) === String(id)));
    user.shippingAddresses = list;
    user.defaultShippingAddressId = String(id);

    ensureSingleDefault(user);
    await user.save();

    res.json({ ok: true, user: toUserPayload(user) });
  })
);

/* =========================
   Password reset
========================= */

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { phone, fullName, newPassword } = req.body;

    if (!phone || !fullName || !newPassword) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    const a = String(user.fullName || "").trim().toLowerCase();
    const b = String(fullName).trim().toLowerCase();
    if (a !== b) return res.status(401).json({ ok: false, message: "Name/phone did not match" });

    if (String(newPassword).length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    res.json({ ok: true, message: "Password updated" });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { phone, fullName, newPassword } = req.body;

    if (!phone || !fullName || !newPassword) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    const dbName = String(user.fullName || "").trim().toLowerCase();
    const inName = String(fullName || "").trim().toLowerCase();

    if (dbName !== inName) {
      return res.status(401).json({ ok: false, message: "Name + phone not matched" });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    res.json({ ok: true, message: "Password updated" });
  })
);

export default router;