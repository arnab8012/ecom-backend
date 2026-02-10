import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const base = "https://thecuriousempire.com";

    // DB থেকে সব product id + updatedAt নাও
    const products = await Product.find({}, "_id updatedAt").lean();

    const staticUrls = [
      `${base}/`,
      `${base}/shop`,
    ];

    const productUrls = products.map((p) => {
      const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString() : null;
      return `
<url>
  <loc>${base}/product/${p._id}</loc>
  ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
</url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.map((u) => `<url><loc>${u}</loc></url>`).join("\n")}
${productUrls.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.send(xml);
  } catch (e) {
    console.error(e);
    res.status(500).send("sitemap error");
  }
});

export default router;