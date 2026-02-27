import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";

    if (!token) {
      return res.status(401).json({ ok: false, message: "No token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, message: "Invalid token" });
    }

    const userId = decoded?.id || decoded?._id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Invalid token payload" });
    }

    // ✅ passwordHash কখনোই পাঠাবে না
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ ok: false, message: "User not found" });
    }

    // ✅ blocked user হলে reject
    if (user.status && user.status !== "ACTIVE") {
      return res.status(403).json({ ok: false, message: "User blocked" });
    }

    req.user = user;
    req.userId = String(user._id);

    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
}