import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
  const base = "https://thecuriousempire.com";

  const products = await Product.find({ isActive: true }).select("_id updatedAt").lean();

  const urls = [
    `${base}/`,
    `${base}/shop`,
    ...products.map((p) => `${base}/product/${p._id}`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${u}</loc></url>`)
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.send(xml);
});

export default router;