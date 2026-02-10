// backend/src/routes/sitemap.js
import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const base = "https://thecuriousempire.com";

    // ✅ products: _id + updatedAt + createdAt (fallback এর জন্য)
    const products = await Product.find({}, "_id updatedAt createdAt isActive").lean();

    // ✅ Static pages (public)
    const staticUrls = [
      `${base}/`,
      `${base}/shop`,
    ];

    // ✅ Dynamic product pages
    // (optional) isActive false হলে skip করবে
    const productUrls = products
      .filter((p) => p.isActive !== false)
      .map((p) => {
        const d = p.updatedAt || p.createdAt; // ✅ fallback
        const lastmod = d ? new Date(d).toISOString() : null;
        return { loc: `${base}/product/${p._id}`, lastmod };
      });

    const urlsXml =
      staticUrls.map((u) => `<url><loc>${u}</loc></url>`).join("") +
      productUrls
        .map(
          (u) =>
            `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`
        )
        .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.status(200).send(xml);
  } catch (e) {
    console.error("❌ sitemap error:", e);
    res.status(500).send("sitemap error");
  }
});

export default router;