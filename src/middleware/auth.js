import jwt from "jsonwebtoken";
import User from "../models/User.js"; // আপনার User model path ঠিক না হলে বলবেন

export async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";

    if (!token) {
      return res.status(401).json({ ok: false, message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded.id বা decoded._id যেটা আপনার token এ আছে
    const userId = decoded.id || decoded._id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Invalid token" });
    }

    const user = await User.findById(userId).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ ok: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
}
