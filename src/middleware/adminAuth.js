import jwt from "jsonwebtoken";

export function adminAuth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";

    if (!token) return res.status(401).json({ ok: false, message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ admin token payload should have { email, role:"admin" } or { isAdmin:true }
    const role = decoded.role || (decoded.isAdmin ? "admin" : "");
    if (role !== "admin") return res.status(403).json({ ok: false, message: "Admin only" });

    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
}
