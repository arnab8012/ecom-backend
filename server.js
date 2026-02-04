console.log("🔥 SERVER FILE LOADED");
import dotenv from "dotenv";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

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

app.use(helmet());
app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ ok: true, message: "E-commerce API running" }));

// ✅ Public Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/banners", bannersRoutes);

// ✅ Admin Routes
app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/admin/upload", adminUploadRoutes);   // ✅ upload routes এখানে
app.use("/api/admin/banners", adminBannersRoutes); // ✅ banners admin CRUD এখানে
app.use("/api/admin", adminRoutes);                // ✅ products/orders admin (existing)

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI)
  .then(() => {
  app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

  })  
  .catch((e) => {
    console.error("❌ DB connect failed", e);
    process.exit(1);
  });
