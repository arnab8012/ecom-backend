import express from "express";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ ok: false, message: "Missing fields" });

    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ ok: false, message: "Invalid admin credentials" });
    }

    const token = jwt.sign({ id: "admin", role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({ ok: true, token, admin: { email } });
  })
);

export default router;
