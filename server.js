import dotenv from "dotenv";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { fileURLToPath } from "url";

import { connectDB } from "./src/config/db.js";
import { notFound, errorHandler } from "./src/middleware/error.js";

import authRoutes from "./src/routes/auth.js";
import adminAuthRoutes from "./src/routes/adminAuth.js";
import categoriesRoutes from "./src/routes/categories.js";
import productsRoutes from "./src/routes/products.js";
import ordersRoutes from "./src/routes/orders.js";
import adminRoutes from "./src/routes/admin.js";

import bannersRoutes from "./src/routes/banners.js";
import adminBannersRoutes from "./src/routes/adminBanners.js";
import adminUploadRoutes from "./src/routes/adminUploadRoutes.js";
import sitemapRoutes from "./src/routes/sitemap.js";

dotenv.config();
console.log("🔥 SERVER FILE LOADED");

const app = express();

// ✅ Render / proxy friendly
app.set("trust proxy", 1);

// ✅ Basic security
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// ✅ Body parsers (IMPORTANT: CORS এর আগেই রাখো)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   ✅ CORS (Vercel + Custom domain safe)
   CLIENT_ORIGIN env example (comma separated):
   CLIENT_ORIGIN=http://localhost:3000,https://thecuriousempire.com,https://thecuriousempire-nextjs-frontend.vercel.app
========================= */

// ✅ CORS allowlist from env (comma-separated)
const rawOrigins = process.env.CLIENT_ORIGIN || "";
const allowList = rawOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ✅ normalize helper: remove trailing slash + handle www/non-www matching
const normalizeOrigin = (o = "") => {
  try {
    const u = new URL(o);
    // remove trailing slash style differences
    return `${u.protocol}//${u.host}`;
  } catch {
    return o.replace(/\/+$/, "");
  }
};

const normalizedAllowList = allowList.map(normalizeOrigin);

const corsOptions = {
  origin: (origin, cb) => {
    // Postman/curl/hoppscotch sometimes origin-less
    if (!origin) return cb(null, true);

    // if allowList empty => allow all (debug friendly)
    if (normalizedAllowList.length === 0) return cb(null, true);

    const reqOrigin = normalizeOrigin(origin);

    // direct match
    if (normalizedAllowList.includes(reqOrigin)) return cb(null, true);

    // www <-> non-www fallback match
    const alt1 = reqOrigin.replace("://www.", "://");
    const alt2 = reqOrigin.includes("://")
      ? reqOrigin.replace("://", "://www.")
      : reqOrigin;

    if (normalizedAllowList.includes(alt1)) return cb(null, true);
    if (normalizedAllowList.includes(alt2)) return cb(null, true);

    console.log("❌ CORS blocked origin:", origin);
    console.log("✅ Allowed CLIENT_ORIGIN:", normalizedAllowList);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

// ✅ Apply CORS (ONLY ONCE)
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(morgan("dev"));

// ✅ Health
app.get("/", (req, res) =>
  res.json({ ok: true, message: "E-commerce API running" })
);

// ✅ Optional API root
app.get("/api", (req, res) => res.json({ ok: true, message: "API root" }));

// ✅ Static uploads (if exists)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Public Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/banners", bannersRoutes);

// ✅ Admin Routes
app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/admin/upload", adminUploadRoutes);
app.use("/api/admin/banners", adminBannersRoutes);
app.use("/api/admin", adminRoutes);

app.use("/", sitemapRoutes); // ✅ serves /sitemap.xml

// ✅ Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(
        "✅ Allowed CLIENT_ORIGIN:",
        normalizedAllowList.length ? normalizedAllowList : "(ALL - not set)"
      );
    });
  })
  .catch((e) => {
    console.error("❌ DB connect failed", e);
    process.exit(1);
  });