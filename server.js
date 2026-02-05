console.log("🔥 SERVER FILE LOADED");

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

dotenv.config();

const app = express();

// ✅ Render / proxy friendly
app.set("trust proxy", 1);

// ✅ Basic security
app.use(helmet());

// ✅ Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ CORS (supports single or multiple origins)
// .env উদাহরণ:
// CLIENT_ORIGIN=https://thecuriousempire.com,https://www.thecuriousempire.com,http://localhost:5173
const rawOrigins = process.env.CLIENT_ORIGIN || "";
const allowList = rawOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Postman/curl এর মতো origin-less request allow
      if (!origin) return cb(null, true);

      // allowList খালি থাকলে সবাইকে allow (ডিবাগে সুবিধা)
      if (allowList.length === 0) return cb(null, true);

      // allow matched origins
      if (allowList.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(morgan("dev"));

// ✅ Health check
app.get("/", (req, res) => res.json({ ok: true, message: "E-commerce API running" }));

// ✅ (Optional) Serve static uploads if your upload route saves files locally
// যদি তোমার backend/src/uploads বা backend/uploads থাকে, তাহলে এটা কাজে লাগবে।
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
app.use("/api/admin/upload", adminUploadRoutes); // ✅ upload routes এখানে
app.use("/api/admin/banners", adminBannersRoutes); // ✅ banners admin CRUD এখানে
app.use("/api/admin", adminRoutes); // ✅ products/orders admin (existing)

// ✅ Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// ✅ DB connect + listen
connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log("✅ Allowed CLIENT_ORIGIN:", allowList.length ? allowList : "(ALL - not set)");
    });
  })
  .catch((e) => {
    console.error("❌ DB connect failed", e);
    process.exit(1);
  });