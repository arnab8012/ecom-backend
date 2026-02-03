import express from "express";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    // ✅ trim + normalize
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminPass = String(process.env.ADMIN_PASSWORD || "").trim();

    if (email !== adminEmail || password !== adminPass) {
      return res.status(401).json({ ok: false, message: "Invalid admin credentials" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ ok: false, message: "JWT_SECRET missing in server env" });
    }

    const token = jwt.sign({ id: "admin", role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ ok: true, token, admin: { email } });
  })
);

export default router;