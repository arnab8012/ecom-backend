import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

const router = express.Router();

// ✅ Categories (admin)
router.post(
  "/categories",
  adminAuth,
  asyncHandler(async (req, res) => {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ ok: false, message: "Name required" });

    const cat = await Category.create({ name, icon: icon || "" });
    res.json({ ok: true, category: cat });
  })
);
// ✅ DELETE category (admin)  <-- এইটা নতুন যোগ করো
router.delete(
  "/categories/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ ok: false, message: "Category not found" });

    await cat.deleteOne();
    res.json({ ok: true });
  })
);
// ✅ Products (admin)
router.post(
  "/products",
  adminAuth,
  asyncHandler(async (req, res) => {
    const { title, category, price, compareAtPrice, images, description, variants, deliveryDays } = req.body;
    if (!title || !category || !price) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    const p = await Product.create({
      title,
      category,
      price,
      compareAtPrice: compareAtPrice || 0,
      images: Array.isArray(images) ? images : [],
      description: description || "",
      variants: Array.isArray(variants) ? variants : [],
      deliveryDays: deliveryDays || "3-5 days",
      isActive: true
    });

    res.json({ ok: true, product: p });
  })
);

router.put(
  "/products/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ ok: false, message: "Not found" });

    Object.assign(p, req.body || {});
    await p.save();

    res.json({ ok: true, product: p });
  })
);

router.delete(
  "/products/:id",
  adminAuth,
  asyncHandler(async (req, res) => {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ ok: false, message: "Not found" });

    await p.deleteOne();
    res.json({ ok: true });
  })
);

// ✅ Orders (admin)
router.get(
  "/orders",
  adminAuth,
  asyncHandler(async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ ok: true, orders });
  })
);

// ✅ Order status update (admin)  <-- এখানে তোমার Unauthorized fix হবে
router.put(
  "/orders/:id/status",
  adminAuth,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const allowed = ["PLACED", "CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    order.status = status;
    await order.save();

    res.json({ ok: true, order });
  })
);

export default router;
