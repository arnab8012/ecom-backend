import express from "express";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

/**
 * ✅ GET /api/products
 * Support:
 *  - /api/products
 *  - /api/products?category=CAT_ID
 *  - /api/products?q=charger
 *  - /api/products?category=CAT_ID&q=charger
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, q } = req.query;

    const filter = { isActive: true };

    // category filter
    if (category) filter.category = category;

    // 🔍 search filter (title + description)
    if (q && q.trim()) {
      filter.$or = [
        { title: { $regex: q.trim(), $options: "i" } },
        { description: { $regex: q.trim(), $options: "i" } }
      ];
    }

    const products = await Product.find(filter)
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json({ ok: true, products });
  })
);

/**
 * ✅ GET /api/products/:id
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const p = await Product.findById(req.params.id).populate("category", "name");
    if (!p || p.isActive === false) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }
    res.json({ ok: true, product: p });
  })
);

export default router;
