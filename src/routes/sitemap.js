import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    // ✅ live domain auto detect (সবচেয়ে safe)
    const base = `${req.protocol}://${req.get("host")}`;

    // ✅ DB থেকে সব product id + updatedAt আনবে
    const products = await Product.find({}, "_id updatedAt").lean();

    const staticUrls = [`${base}/`, `${base}/shop`];

    const productUrls = products.map((p) => {
      const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString() : null;
      return { loc: `${base}/product/${p._id}`, lastmod };
    });

    const urlsXml =
      staticUrls.map((u) => `<url><loc>${u}</loc></url>`).join("") +
      productUrls
        .map(
          (u) =>
            `<url><loc>${u.loc}</loc>${
              u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""
            }</url>`
        )
        .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (e) {
    console.error(e);
    res.status(500).send("sitemap error");
  }
});

export default router;