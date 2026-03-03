import express from "express";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Banner from "../models/Banner.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [categories, banners] = await Promise.all([
      Category.find().sort({ createdAt: 1 }).lean(),
      Banner.find({ isActive: true }).sort({ sort: 1, createdAt: -1 }).lean(),
    ]);

    const pairs = await Promise.all(
      categories.map(async (c) => {
        const items = await Product.find({ category: c._id, isActive: true })
          .sort({ createdAt: -1 })
          .limit(4)
          .populate("category")
          .lean();

        return [String(c._id), items];
      })
    );

    const productsByCategory = Object.fromEntries(pairs);

    return res.json({ ok: true, categories, banners, productsByCategory });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || String(e) });
  }
});

export default router;