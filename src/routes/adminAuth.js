import express from "express";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// 🔐 ADMIN LOGIN
router.post(
  "/login",
  asyncHandler(async (req, res) => {
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

    const token = jwt.sign(
      { id: "admin", role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ ok: true, token, admin: { email } });
  })
);

// 🔐 ADMIN TOKEN VERIFY (IMPORTANT)
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const auth = String(req.headers.authorization || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      return res.status(401).json({ ok: false, message: "No token" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role !== "admin") {
        return res.status(401).json({ ok: false, message: "Not admin" });
      }

      res.json({
        ok: true,
        admin: { id: decoded.id, role: decoded.role },
      });
    } catch {
      res.status(401).json({ ok: false, message: "Invalid token" });
    }
  })
);

export default router;